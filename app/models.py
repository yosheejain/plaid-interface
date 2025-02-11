from app import db, login_manager
from flask_login import UserMixin

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

class User(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(20), unique=True, nullable=False)
    password = db.Column(db.String(60), nullable=False)
    domain = db.Column(db.String(20), nullable=False)
    suggest_index = db.Column(db.Integer, nullable=False, default = 0)
    is_temp = db.Column(db.Boolean, nullable=False, default=False)

class UserBox(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    box_id = db.Column(db.String(100), nullable=False) 
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    goal = db.Column(db.String(100), nullable=False)
    solution = db.Column(db.Text, nullable=False)
    changeable_areas = db.Column(db.Text, nullable=False)
    position_x = db.Column(db.Float, nullable=False)
    position_y = db.Column(db.Float, nullable=False)
    user = db.relationship('User', backref=db.backref('boxes', lazy=True))
    cart = db.Column(db.Boolean, nullable=False, default=False)
