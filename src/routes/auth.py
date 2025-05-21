from flask import Blueprint, request, jsonify, current_app, g
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
from datetime import datetime, timedelta
from functools import wraps

from src.models import db
from src.models.user import User

auth_bp = Blueprint('auth', __name__)

# Configuración por defecto para expiración de JWT
JWT_EXP_DAYS = int(current_app.config.get('JWT_EXP_DELTA_DAYS', 7))

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({'success': False, 'message': 'Token missing'}), 401

        token = auth_header.split(' ', 1)[1]
        try:
            payload = jwt.decode(
                token,
                current_app.config['SECRET_KEY'],
                algorithms=['HS256']
            )
        except jwt.ExpiredSignatureError:
            return jsonify({'success': False, 'message': 'Token expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'success': False, 'message': 'Invalid token'}), 401

        user = User.query.get(payload.get('user_id'))
        if not user:
            return jsonify({'success': False, 'message': 'User not found'}), 404

        # Guardar el usuario en flask.g para acceso en la ruta
        g.current_user = user
        return f(*args, **kwargs)
    return decorated

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    if not all(k in data for k in ('username', 'email', 'password')):
        return jsonify({'success': False, 'message': 'Datos incompletos'}), 400

    if User.query.filter_by(username=data['username']).first():
        return jsonify({'success': False, 'message': 'Username en uso'}), 409
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'success': False, 'message': 'Email en uso'}), 409

    user = User(
        username=data['username'].strip(),
        email=data['email'].strip().lower()
    )
    user.set_password(data['password'])
    db.session.add(user)
    db.session.commit()

    # Generar token inmediatamente al registrarse
    exp = datetime.utcnow() + timedelta(days=JWT_EXP_DAYS)
    token = jwt.encode(
        {'user_id': user.id, 'exp': exp},
        current_app.config['SECRET_KEY'],
        algorithm='HS256'
    )

    return jsonify({
        'success': True,
        'data': {
            'token': token,
            'user': user.to_dict()
        }
    }), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    user = User.query.filter_by(email=data.get('email', '').strip().lower()).first()
    if not user or not user.check_password(data.get('password', '')):
        return jsonify({'success': False, 'message': 'Credenciales inválidas'}), 401

    exp = datetime.utcnow() + timedelta(days=JWT_EXP_DAYS)
    token = jwt.encode(
        {'user_id': user.id, 'exp': exp},
        current_app.config['SECRET_KEY'],
        algorithm='HS256'
    )

    return jsonify({
        'success': True,
        'data': {
            'token': token,
            'user': user.to_dict()
        }
    }), 200

@auth_bp.route('/validate-token', methods=['GET'])
@token_required
def validate_token():
    # Decoding already validó expiración
    # Opcional: devolver tiempo restante
    return jsonify({'success': True, 'message': 'Token válido'}), 200

@auth_bp.route('/profile', methods=['GET'])
@token_required
def get_profile():
    user = g.current_user
    return jsonify({'success': True, 'data': user.to_dict()}), 200

@auth_bp.route('/profile', methods=['PUT'])
@token_required
def update_profile():
    user = g.current_user
    data = request.get_json() or {}

    if 'username' in data:
        username = data['username'].strip()
        existing = User.query.filter_by(username=username).first()
        if existing and existing.id != user.id:
            return jsonify({'success': False, 'message': 'Username en uso'}), 409
        user.username = username

    if 'email' in data:
        email = data['email'].strip().lower()
        existing = User.query.filter_by(email=email).first()
        if existing and existing.id != user.id:
            return jsonify({'success': False, 'message': 'Email en uso'}), 409
        user.email = email

    if 'password' in data and data['password']:
        user.set_password(data['password'])

    db.session.commit()
    return jsonify({
        'success': True,
        'data': {
            'message': 'Perfil actualizado',
            'user': user.to_dict()
        }
    }), 200
