from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

from src.models import db
from src.models.user import User
from src.models.league import League, LeagueMembership
from src.models.match import Match, MatchParticipation
from src.models.card import Card, CardAssignment
from src.models.rating import PlayerRating, MatchPhoto

# Función para inicializar las cartas del sistema
def initialize_cards():
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
        card = Card.query.filter_by(name=card_data["name"]).first()
        if not card:
            new_card = Card(
                name=card_data["name"],
                description=card_data["description"],
                is_active=True
            )
            db.session.add(new_card)
    
    db.session.commit()
