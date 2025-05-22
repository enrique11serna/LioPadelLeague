import os
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import inspect

# Instancia de SQLAlchemy
# ----------------------
db = SQLAlchemy()


def init_app(app):
    """
    Inicializa la aplicación Flask con SQLAlchemy, crea las tablas y realiza auto-migraciones.

    Debe llamarse en src/main.py antes de registrar los blueprints.
    """
    # Leer variables de entorno (desde Render o Railway)
    DB_USER = os.environ.get('DB_USER')
    DB_PASSWORD = os.environ.get('DB_PASSWORD')
    DB_HOST = os.environ.get('DB_HOST')
    DB_PORT = os.environ.get('DB_PORT')
    DB_NAME = os.environ.get('DB_NAME')

    # Construir URI de conexión a MySQL
    DB_URI = f'mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}'

    # Configurar SQLAlchemy
    app.config['SQLALCHEMY_DATABASE_URI'] = DB_URI
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    db.init_app(app)

    # Contexto de aplicación para crear tablas y migrar
    with app.app_context():
        # Importar modelos para que SQLAlchemy los conozca
        from src.models.user import User
        from src.models.league import League, LeagueMembership
        from src.models.match import Match, MatchParticipation
        from src.models.card import Card, CardAssignment
        from src.models.rating import PlayerRating, MatchPhoto

        # Crear todas las tablas según los modelos definidos
        db.create_all()

        # Auto-migrar: añadir columna 'is_private' si falta en la tabla 'leagues'
        inspector = inspect(db.engine)
        existing_columns = [col['name'] for col in inspector.get_columns('leagues')]
        if 'is_private' not in existing_columns:
            db.session.execute(
                'ALTER TABLE leagues ADD COLUMN is_private TINYINT(1) NOT NULL DEFAULT 1'
            )
            db.session.commit()

        # Inicializar las cartas iniciales si no existen
        initialize_cards()


def initialize_cards():
    """
    Inserta en la base de datos las cartas iniciales si no están presentes.
    """
    from src.models.card import Card

    cards = [
        {"name": "Gano punto gano juego", "description": "Convierte un punto ganado en un juego completo"},
        {"name": "Restan cambiados de lado", "description": "Los jugadores del equipo contrario deben jugar cambiados de lado"},
        {"name": "Robo carta", "description": "Permite robar la carta de un jugador del equipo contrario"},
        {"name": "Anulo doble falta", "description": "Anula una doble falta del equipo propio"},
        {"name": "Robo saque", "description": "Permite robar el saque al equipo contrario"},
        {"name": "Repetimos el punto", "description": "Permite repetir el último punto jugado"},
        {"name": "Bloqueo de carta rival", "description": "Bloquea el uso de una carta del equipo contrario"}
    ]

    for card_data in cards:
        existing = Card.query.filter_by(name=card_data["name"]).first()
        if not existing:
            card = Card(
                name=card_data["name"],
                description=card_data["description"],
                is_active=True
            )
            db.session.add(card)

    db.session.commit()
