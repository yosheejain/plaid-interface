from app import db, bcrypt
from app.models import User, UserBox

db.create_all()

users = {
    'pandas_user': (None, 'pandas'),
    'django_user': (None, 'django'),
    'beautifulsoup_user': (None, 'beautifulsoup'),
    'pytorch_user': (None, 'pytorch'),
}

for username, info in users.items():
    if info[0] is None:
        info = input("Enter password for user '{}': ".format(username)), info[1]
    hashed_password = bcrypt.generate_password_hash(info[0]).decode('utf-8')
    user = User(username=username, password=hashed_password, domain=info[1])
    db.session.add(user)
    db.session.commit()

