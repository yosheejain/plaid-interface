import csv
import os
from flask import render_template, url_for, flash, redirect, request, jsonify, session
from app import app, db, bcrypt
from app.forms import LoginForm
from app.models import User, UserBox
from flask_login import login_user, current_user, logout_user, login_required
import logging
from database import get_saved_plans
from openai import OpenAI, AzureOpenAI
from flask import Flask, Response
from io import StringIO
import uuid
import random
import string
import threading
import subprocess
import copy
from logging.handlers import RotatingFileHandler

logfilename = os.path.join(os.environ['HOME'], 'logs', 'passenger_wsgi.log')
os.makedirs(os.path.dirname(logfilename), exist_ok=True)
logformat = "[%(asctime)s] [%(levelname)s] [%(name)s] %(message)s"
loglevel = logging.INFO
handler = RotatingFileHandler(logfilename, maxBytes=1048576, backupCount=5)
handler.setLevel(loglevel)
handler.setFormatter(logging.Formatter(logformat))
logging.basicConfig(filename=logfilename, format=logformat, level=loglevel)
logger = logging.getLogger("passenger_wsgi")
logger.addHandler(handler)
logger.setLevel(loglevel)

api_key = "enter your api key here"
api_version = "enter your api version here"
azure_endpoint = "enter your azure endpoint here"
model_name = "enter your model name here"

html_to_csv_attribute_names = {
    'name': 'Name',
    'goal': 'Subgoal Labels',
    'solution': 'Subgoal Code',
    'changeable_areas': 'code_blocks_list'
}

csv_to_html_attribute_names = {value: key for key, value in html_to_csv_attribute_names.items()}

def delete_temp_user(user_id):
    with app.app_context():
        user = User.query.get(user_id)
        if user and getattr(user, 'is_temp', False):
            user_boxes = UserBox.query.filter_by(user_id=current_user.id).all()
            for box in user_boxes:
                db.session.delete(box)
            db.session.delete(user)
            db.session.commit()
            print(f"Temporary user {user.username} deleted due to timeout.")


@app.route('/temp_login', methods=['GET'])
def temp_login(domain='pandas'):
    if domain not in ["pandas", "django", "beautifulsoup", "pytorch"]:
        return redirect(url_for('login'))
    username = "temp_" + uuid.uuid4().hex[:8]
    password = ''.join(random.choices(string.ascii_letters + string.digits, k=12))
    domain = random.choice(["pandas", "django", "beautifulsoup", "pytorch"])

    hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
    temp_user = User(username=username, password=hashed_password, domain=domain)
    temp_user.is_temp = True

    db.session.add(temp_user)
    db.session.commit()

    login_user(temp_user)

    t = threading.Timer(900, delete_temp_user, args=[temp_user.id])
    t.start()

    return redirect(url_for('canvas', domain=domain, mode='edit'))


@app.route("/")
@app.route("/login", methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('canvas', domain=current_user.domain, mode='edit'))
    form = LoginForm()
    if form.validate_on_submit():
        user = User.query.filter_by(username=form.username.data).first()
        if user and bcrypt.check_password_hash(user.password, form.password.data):
            login_user(user, remember=form.remember.data)
            return redirect(url_for('canvas', domain=current_user.domain, mode='edit'))
        else:
            flash('Login Unsuccessful. Please check username and password', 'danger')
    return render_template('login.html', title='PlanID - Login', form=form)


@app.route("/select_domain", methods=['POST'])
@login_required
def select_domain():
    domain = request.form.get('domain')
    if domain:
        return redirect(url_for('canvas', domain=domain, mode='edit'))


@app.route("/canvas/<domain>/<mode>")
@login_required
def canvas(domain, mode='edit'):
    user_boxes = UserBox.query.filter_by(user_id=current_user.id).all() if mode == 'edit' else UserBox.query.filter_by(user_id=current_user.id, cart=True).all()

    csv_filename = f'app/data/{domain}_subsampled_representative.csv'
    if len(user_boxes) == 0 and mode == 'edit' and os.path.exists(csv_filename):
        with open(csv_filename, 'r') as file:
            reader = csv.DictReader(file)
            created_boxes = set()
            for idx, row in enumerate(reader):
                if idx == 0:
                    box_id = row['Cluster']
                    if box_id not in created_boxes:
                        user_box = UserBox(
                            box_id=box_id,
                            user_id=current_user.id,
                            name=row['Name'],
                            goal=row['Subgoal Labels'],
                            solution=row['Subgoal Code'],
                            changeable_areas=row['code_blocks_list'],
                            position_x=float(row['position_x']),
                            position_y=float(row['position_y'])
                        )
                        db.session.add(user_box)
                        created_boxes.add(box_id)
            db.session.commit()
    session['suggest_index'] = 1

    user_boxes = UserBox.query.filter_by(user_id=current_user.id).all() if mode == 'edit' else UserBox.query.filter_by(user_id=current_user.id, cart=True).all()

    return render_template('canvas.html', title='PlanID - Creator', user_boxes=user_boxes, editMode=(mode == 'edit'), domainName=domain)

@app.route("/load_more_clusters", methods=['GET'])
@login_required
def load_more_clusters():

    if session['suggest_index'] == -1:
        return jsonify(), 404
    logger.info(f"index: {session['suggest_index']}")

    csv_filename = f'app/data/{current_user.domain}_subsampled_representative.csv'
    if os.path.exists(csv_filename):
        with open(csv_filename, 'r') as file:
            reader = csv.DictReader(file)
            for idx, row in enumerate(reader):
                logger.info(f"{idx}: {session['suggest_index']}")
                if idx >= session['suggest_index']:
                    box_id = row['Cluster']
                    box = UserBox(
                        box_id=box_id,
                        user_id=current_user.id,
                        name=row['Name'],
                        goal=row['Subgoal Labels'],
                        solution=row['Subgoal Code'],
                        changeable_areas=row['code_blocks_list'],
                        position_x=float(row['position_x']),
                        position_y=float(row['position_y'])
                    )
                    db.session.add(box)
                    db.session.commit()
                    session['suggest_index'] += 1
                    logger.info(f"breaking: {session['suggest_index']}")
                    break
            else:
                session['suggest_index'] = -1
                return jsonify(), 400
    logger.info(f"{session['suggest_index']}")

    user_box = UserBox.query.filter_by(user_id=current_user.id, box_id=box_id).first()

    return jsonify({c.name: getattr(user_box, c.name) for c in user_box.__table__.columns}), 200



@app.route("/potential_values/<box_id>/<field>", methods=['GET'])
@login_required
def potential_values(box_id, field):
    values = set()

    with open(f'app/data/{current_user.domain}_subsampled.csv', 'r') as file:
        reader = csv.DictReader(file)
        for row in reader:
            if box_id.startswith('new') or (row['Cluster'] == box_id and html_to_csv_attribute_names[field] in row):
                value = row[html_to_csv_attribute_names[field]]
                if value not in values:
                    values.add(value)

    return jsonify(list(values))

@app.route("/save_new_box", methods=['POST'])
@login_required
def save_new_box():
    data = request.get_json()
    logger.info(f"{data}")
    new_box = UserBox(
        box_id=data['id'],
        user_id=current_user.id,
        name=data[csv_to_html_attribute_names['Name']],
        goal=data[csv_to_html_attribute_names['Subgoal Labels']],
        solution=data[csv_to_html_attribute_names['Subgoal Code']],
        changeable_areas=data[csv_to_html_attribute_names['code_blocks_list']],
        position_x=data['position_x'],
        position_y=data['position_y'],
        cart=False,
    )
    db.session.add(new_box)
    db.session.commit()
    return jsonify({"message": "New box saved successfully!"})

@app.route("/save_content", methods=['POST'])
@login_required
def save_content():
    data = request.get_json()
    user_boxes = data.get('user_boxes', [])

    UserBox.query.filter_by(user_id=current_user.id).delete()

    for box in user_boxes:
        user_box = UserBox(
            box_id=box['box_id'],
            user_id=current_user.id,
            name=box[csv_to_html_attribute_names['Name']],
            goal=box[csv_to_html_attribute_names['Subgoal Labels']],
            solution=box[csv_to_html_attribute_names['Subgoal Code']],
            changeable_areas=box[csv_to_html_attribute_names['code_blocks_list']],
            position_x=box['position_x'],
            position_y=box['position_y'],
            cart=box['cart'] == 'true'
        )
        db.session.add(user_box)
    db.session.commit()

    return jsonify({"message": "Content saved successfully!"})

@app.route("/logout", methods=['POST'])
@login_required
def logout():
    user_id = current_user.id
    is_temp = getattr(current_user, 'is_temp', False)
    if is_temp:
        user = User.query.get(user_id)
        if user:
            user_boxes = UserBox.query.filter_by(user_id=current_user.id).all()
            for box in user_boxes:
                db.session.delete(box)

            db.session.delete(user)
            db.session.commit()
            print(f"Temporary user {user.username} deleted upon logout.")

    logout_user()
    return redirect(url_for('login'))


@app.route("/delete_box/<box_id>", methods=['DELETE'])
@login_required
def delete_box(box_id):
    user_box = UserBox.query.filter_by(user_id=current_user.id, box_id=box_id).first()
    if user_box:
        db.session.delete(user_box)
        db.session.commit()
        return jsonify({"success": True, "message": "Box deleted successfully!"})
    return jsonify({"success": False, "message": "Box not found!"}), 404

@app.route("/code_data")
@login_required
def code_data():
    column_values = []
    with open('app/data/pandas_With_Code_Only.csv', 'r') as file:
        reader = csv.DictReader(file)
        for row in reader:
            column_values.append(row['code_blocks'])
    return jsonify(column_values)

@app.route("/load_domain_data/<domain>")
@login_required
def load_domain_data(domain):
    tab1_data = []
    tab2_data = []

    tab1_filename = f'app/data/{domain}_With_Code_Only.csv'
    if os.path.exists(tab1_filename):
        with open(tab1_filename, 'r') as file:
            reader = csv.DictReader(file)
            for row in reader:
                tab1_data.append({'id': row['id'], 'text_block': row['Body'], 'details': row['code_blocks']})

    tab2_filename = f'app/data/{domain}_With_Code_Only.csv'
    if os.path.exists(tab2_filename):
        with open(tab2_filename, 'r') as file:
            reader = csv.DictReader(file)
            for row in reader:
                tab2_data.append(row['code_blocks'])

    return jsonify({'tab1_data': tab1_data, 'tab2_data': tab2_data})

@app.route('/add_to_cart', methods=['POST'])
@login_required
def add_to_cart():
    box_details = request.json
    if not box_details:
        return jsonify({'success': 'Failed to add box to the cart.'}), 400

    try:

        box = UserBox.query.filter_by(user_id=current_user.id, box_id=box_details['box_id']).first()
        if not box:
            return jsonify({'success': 'Failed to add box to the cart.'}), 400
        elif box.cart:
            return jsonify({'success': 'Box already in cart.'}), 200
        else:
            box.cart = True
        logger.info(f"{box} - {box.cart}")
        db.session.commit()


        return jsonify({'success': 'Box added to cart successfully.'})
    except Exception as e:
        logger.info(f'Error: {e}')
        return jsonify({'success': 'Failed to add box to the cart.'}), 500
    
@app.route('/remove_from_cart', methods=['POST'])
@login_required
def remove_from_cart():
    box_details = request.json
    if not box_details:
        return jsonify({'success': 'Failed to remove box from the cart.'}), 400

    try:
        box = UserBox.query.filter_by(user_id=current_user.id, box_id=box_details['box_id']).first()
        if not box:
            return jsonify({'success': 'Failed to remove box from the cart.'}), 400
        elif not box.cart:
            return jsonify({'success': 'Box not in cart.'}), 200
        else:
            box.cart = False
        logger.info(f"{box} - {box.cart}")
        db.session.commit()

        return jsonify({'success': 'Box removed from cart successfully.'})
    except Exception as e:
        logger.info(f'Error: {e}')
        return jsonify({'success': 'Failed to remove box from the cart.'}), 500


@app.route("/cart/<domain>")
@login_required
def cart(domain):
    return redirect(url_for('canvas', domain=domain, mode='cart'))

@app.route('/export_plans')
def export_plans():
    saved_plans = get_saved_plans()

    csv_data = StringIO()
    csv_writer = csv.writer(csv_data)
    csv_writer.writerow(['Name', 'Goal', 'Solution', 'Changeable Areas'])
    for plan in saved_plans:
        csv_writer.writerow([plan.name, plan.goal, plan.solution, plan.changeable_areas])

    csv_data.seek(0)
    return Response(csv_data.getvalue(), mimetype='text/csv', headers={"Content-Disposition": "attachment;filename=saved_plans.csv"})

@app.route('/explain_code', methods=['POST'])
def explain_code():
    data = request.get_json()
    code = data.get('code', '')

    if not code:
        return jsonify({'error': 'No code provided'}), 400

    try:
        prompt = "Explain what this syntax is doing in concise terms, less than 50 words: \n"
        explanation = get_code_explanation(code, prompt)
        return jsonify({'explanation': explanation}), 200
    except Exception as e:
        logger.info(f"Error: {e}")
        return jsonify({'error': str(e)}), 500

def get_code_explanation(code, prompt):
    string = prompt + code
    client = AzureOpenAI(
        api_key=api_key,  
        api_version=api_version,
        azure_endpoint=azure_endpoint
    )
    chat_completion = client.chat.completions.create(
        model=model_name,
        messages=[{"role": "user", "content": string}],
        stream=False,
    )

    try: 
        explanation = chat_completion.choices[0].message.content
    except:
        explanation = "No explanation could be generated."
    
    return explanation

@app.route('/run_code', methods=['POST'])
def run_code():
    data = request.get_json()
    code = data.get('code')
    try:
        prompt = '''Run this code step by step, and generate an example output for the code.
        The output should be formatted in plain text, should be at end of the response, and start with the token OUTPUT$: \n'''
        explanation = get_code_explanation(code, prompt)
        if "OUTPUT$" in explanation:
            code_output = explanation.split('OUTPUT$')[-1]
            return jsonify(success=True, output=code_output)
        else:
            return jsonify(success=False)
    except Exception as e:
        return jsonify(success=False, error=str(e))