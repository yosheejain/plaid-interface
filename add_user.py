from app import db, bcrypt
from app.models import User, UserBox


user = input("Enter username: ")
password = input("Enter password: ")
domain = input("Enter domain (pandas, django, beautifulsoup, pytorch): ")


hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
user = User(username=user, password=hashed_password, domain=domain)
db.session.add(user)
db.session.commit()
