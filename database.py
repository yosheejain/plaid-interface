from app import db
from app.models import UserBox

def get_saved_plans():
    return UserBox.query.filter_by(cart=True).all()