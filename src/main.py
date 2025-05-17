import os
import sys

# Asegurar que se puede importar desde src/
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from flask import Flask, send_from_directory, render_template
from src.models import db
from src.routes.auth import auth_bp
from src.routes.league import league_bp
from src.routes.match import match_bp
from src.routes.result import result_bp
from src.models import initialize_cards

# Crear la app y definir carpeta de archivos estáticos
app = Flask(
    __name__,
    static_folder=os.path.join(os.path.dirname(__file__), 'static'),
    template_folder=os.path.join(os.path.dirname(__file__), 'templates')
)

# Configuración básica
app.config['SECRET_KEY'] = 'asdf#FGSgvasgf$5$WGT'
app.config['SQLALCHEMY_DATABASE_URI'] = f"mysql+pymysql://{os.getenv('DB_USERNAME', 'root')}:{os.getenv('DB_PASSWORD', 'password')}@{os.getenv('DB_HOST', 'localhost')}:{os.getenv('DB_PORT', '3306')}/{os.getenv('DB_NAME', 'mydb')}"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Inicializar DB y cartas
db.init_app(app)
with app.app_context():
    db.create_all()
    initialize_cards()

# Registrar blueprints
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(league_bp, url_prefix='/api/leagues')
app.register_blueprint(match_bp, url_prefix='/api')
app.register_blueprint(result_bp, url_prefix='/api')

# Ruta para servir frontend desde templates/index.html
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path == '' or not '.' in path:
        return render_template('index.html')
    else:
        return send_from_directory(app.static_folder, path)

# Ejecutar la app
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
