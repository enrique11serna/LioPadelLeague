from flask import Blueprint, request, jsonify, current_app
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
from datetime import datetime, timedelta
from functools import wraps
from src.models import db
from src.models.user import User

auth_bp = Blueprint('auth', __name__)

# Decorador para rutas protegidas
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        # Verificar si hay token en el header
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header.startswith('Bearer '):
                token = auth_header.split(' ')[1]
        
        if not token:
            return jsonify({'message': 'Token no proporcionado'}), 401
        
        try:
            # Decodificar token
            data = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=["HS256"])
            current_user = User.query.get(data['user_id'])
            
            if not current_user:
                return jsonify({'message': 'Usuario no encontrado'}), 401
                
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token expirado. Por favor, inicie sesión nuevamente'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Token inválido. Por favor, inicie sesión nuevamente'}), 401
            
        return f(current_user, *args, **kwargs)
    
    return decorated

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    
    # Validar datos requeridos
    if not data or not data.get('username') or not data.get('email') or not data.get('password'):
        return jsonify({'message': 'Datos incompletos'}), 400
    
    # Verificar si el usuario ya existe
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'message': 'El nombre de usuario ya está en uso'}), 409
    
    # Verificar si el email ya existe
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'message': 'El email ya está registrado'}), 409
    
    # Crear nuevo usuario
    new_user = User(
        username=data['username'],
        email=data['email']
    )
    new_user.set_password(data['password'])
    
    db.session.add(new_user)
    db.session.commit()
    
    return jsonify({'message': 'Usuario registrado correctamente'}), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    
    # Validar datos requeridos
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'message': 'Datos incompletos'}), 400
    
    # Buscar usuario por email
    user = User.query.filter_by(email=data['email']).first()
    
    # Verificar si el usuario existe y la contraseña es correcta
    if not user or not user.check_password(data['password']):
        return jsonify({'message': 'Credenciales inválidas'}), 401
    
    # Generar token JWT
    token = jwt.encode({
        'user_id': user.id,
        'exp': datetime.utcnow() + timedelta(days=7)
    }, current_app.config['SECRET_KEY'], algorithm="HS256")
    
    return jsonify({
        'message': 'Inicio de sesión exitoso',
        'token': token,
        'user': user.to_dict()
    }), 200

@auth_bp.route('/profile', methods=['GET'])
@token_required
def get_profile(current_user):
    return jsonify({'user': current_user.to_dict()}), 200

@auth_bp.route('/profile', methods=['PUT'])
@token_required
def update_profile(current_user):
    data = request.get_json()
    
    # Actualizar campos si están presentes
    if data.get('username'):
        # Verificar si el nuevo username ya existe
        existing_user = User.query.filter_by(username=data['username']).first()
        if existing_user and existing_user.id != current_user.id:
            return jsonify({'message': 'El nombre de usuario ya está en uso'}), 409
        current_user.username = data['username']
    
    if data.get('email'):
        # Verificar si el nuevo email ya existe
        existing_user = User.query.filter_by(email=data['email']).first()
        if existing_user and existing_user.id != current_user.id:
            return jsonify({'message': 'El email ya está registrado'}), 409
        current_user.email = data['email']
    
    if data.get('password'):
        current_user.set_password(data['password'])
    
    db.session.commit()
    
    return jsonify({
        'message': 'Perfil actualizado correctamente',
        'user': current_user.to_dict()
    }), 200

@auth_bp.route('/validate-token', methods=['GET'])
@token_required
def validate_token(current_user):
    return jsonify({
        'valid': True,
        'user': current_user.to_dict()
    }), 200
