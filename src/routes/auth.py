from flask import Blueprint, request, jsonify, current_app
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
from datetime import datetime, timedelta
from functools import wraps
from src.models import db
from src.models.user import User

auth_bp = Blueprint('auth', __name__)

def token_required(f):
    @wraps(f)
    def decorated(current_user=None, *args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            hdr = request.headers['Authorization']
            if hdr.startswith('Bearer '):
                token = hdr.split(' ')[1]
        if not token:
            return jsonify({'message':'Token no proporcionado'}), 401
        try:
            data = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
            current_user = User.query.get(data['user_id'])
            if not current_user:
                raise RuntimeError()
        except jwt.ExpiredSignatureError:
            return jsonify({'message':'Token expirado'}), 401
        except:
            return jsonify({'message':'Token inválido'}), 401
        return f(current_user, *args, **kwargs)
    return decorated

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    if not all(k in data for k in ('username','email','password')):
        return jsonify({'message':'Datos incompletos'}),400
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'message':'Username en uso'}),409
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'message':'Email registrado'}),409
    u = User(username=data['username'], email=data['email'])
    u.set_password(data['password'])
    db.session.add(u)
    db.session.commit()
    return jsonify({'message':'Registrado'}),201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    if not all(k in data for k in ('email','password')):
        return jsonify({'message':'Datos incompletos'}),400
    user = User.query.filter_by(email=data['email']).first()
    if not user or not user.check_password(data['password']):
        return jsonify({'message':'Credenciales inválidas'}),401
    token = jwt.encode({
        'user_id': user.id,
        'exp': datetime.utcnow() + timedelta(days=7)
    }, current_app.config['SECRET_KEY'], algorithm='HS256')
    return jsonify({'token': token, 'user': user.to_dict()}),200

@auth_bp.route('/validate-token', methods=['GET'])
@token_required
def validate_token(current_user):
    return jsonify({'valid': True, 'user': current_user.to_dict()}),200

@auth_bp.route('/profile', methods=['GET','PUT'])
@token_required
def profile(current_user):
    if request.method == 'GET':
        return jsonify({'user': current_user.to_dict()}),200
    data = request.get_json() or {}
    # Aquí actualizas username/email/password igual que antes…
    if 'username' in data:
        existing = User.query.filter_by(username=data['username']).first()
        if existing and existing.id != current_user.id:
            return jsonify({'message':'Username en uso'}),409
        current_user.username = data['username']
    if 'email' in data:
        existing = User.query.filter_by(email=data['email']).first()
        if existing and existing.id != current_user.id:
            return jsonify({'message':'Email en uso'}),409
        current_user.email = data['email']
    if 'password' in data and data['password']:
        current_user.set_password(data['password'])
    db.session.commit()
    return jsonify({'message':'Perfil actualizado','user': current_user.to_dict()}),200
