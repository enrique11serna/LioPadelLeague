# src/routes/auth.py

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
    def decorated(*args, **kwargs):
        current_app.logger.info(f"[Auth] token_required for path {request.path}")
        token = None
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]

        if not token:
            current_app.logger.warn("[Auth] Token no proporcionado")
            return jsonify({'message': 'Token no proporcionado'}), 401

        try:
            payload = jwt.decode(
                token,
                current_app.config['SECRET_KEY'],
                algorithms=["HS256"]
            )
            current_user = User.query.get(payload['user_id'])
            if not current_user:
                current_app.logger.warn(f"[Auth] Usuario {payload['user_id']} no encontrado")
                return jsonify({'message': 'Usuario no encontrado'}), 401

        except jwt.ExpiredSignatureError:
            current_app.logger.warn("[Auth] Token expirado")
            return jsonify({'message': 'Token expirado. Por favor, inicie sesión nuevamente'}), 401
        except jwt.InvalidTokenError:
            current_app.logger.warn("[Auth] Token inválido")
            return jsonify({'message': 'Token inválido. Por favor, inicie sesión nuevamente'}), 401

        # Llamamos a la ruta pasando el usuario actual
        return f(current_user, *args, **kwargs)

    return decorated


@auth_bp.route('/register', methods=['POST'])
def register():
    current_app.logger.info("[Auth] POST /register")
    data = request.get_json() or {}
    if not data.get('username') or not data.get('email') or not data.get('password'):
        return jsonify({'message': 'Datos incompletos'}), 400

    if User.query.filter_by(username=data['username']).first():
        return jsonify({'message': 'El nombre de usuario ya está en uso'}), 409

    if User.query.filter_by(email=data['email']).first():
        return jsonify({'message': 'El email ya está registrado'}), 409

    new_user = User(
        username=data['username'],
        email=data['email']
    )
    new_user.set_password(data['password'])

    db.session.add(new_user)
    db.session.commit()

    current_app.logger.info(f"[Auth] Usuario {new_user.id} registrado")
    return jsonify({'message': 'Usuario registrado correctamente'}), 201


@auth_bp.route('/login', methods=['POST'])
def login():
    current_app.logger.info("[Auth] POST /login")
    data = request.get_json() or {}
    if not data.get('email') or not data.get('password'):
        return jsonify({'message': 'Datos incompletos'}), 400

    user = User.query.filter_by(email=data['email']).first()
    if not user or not user.check_password(data['password']):
        current_app.logger.warn(f"[Auth] Credenciales inválidas para email {data.get('email')}")
        return jsonify({'message': 'Credenciales inválidas'}), 401

    token = jwt.encode({
        'user_id': user.id,
        'exp': datetime.utcnow() + timedelta(days=7)
    }, current_app.config['SECRET_KEY'], algorithm="HS256")

    current_app.logger.info(f"[Auth] Usuario {user.id} inició sesión")
    return jsonify({
        'message': 'Inicio de sesión exitoso',
        'token': token,
        'user': user.to_dict()
    }), 200


@auth_bp.route('/profile', methods=['GET'])
@token_required
def get_profile(current_user):
    current_app.logger.info(f"[Auth] GET /profile user={current_user.id}")
    return jsonify({'user': current_user.to_dict()}), 200


@auth_bp.route('/profile', methods=['PUT'])
@token_required
def update_profile(current_user):
    current_app.logger.info(f"[Auth] PUT /profile user={current_user.id}")
    data = request.get_json() or {}

    # Username
    if data.get('username') and data['username'] != current_user.username:
        if User.query.filter_by(username=data['username']).first():
            return jsonify({'message': 'El nombre de usuario ya está en uso'}), 409
        current_user.username = data['username']

    # Email
    if data.get('email') and data['email'] != current_user.email:
        if User.query.filter_by(email=data['email']).first():
            return jsonify({'message': 'El email ya está registrado'}), 409
        current_user.email = data['email']

    # Password
    if data.get('password'):
        current_user.set_password(data['password'])

    db.session.commit()
    current_app.logger.info(f"[Auth] Perfil actualizado user={current_user.id}")
    return jsonify({
        'message': 'Perfil actualizado correctamente',
        'user': current_user.to_dict()
    }), 200


@auth_bp.route('/validate-token', methods=['GET'])
@token_required
def validate_token(current_user):
    current_app.logger.info(f"[Auth] GET /validate-token user={current_user.id}")
    # Sólo devolvemos 200 si el token es válido
    return jsonify({'valid': True}), 200
