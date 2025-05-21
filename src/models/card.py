from datetime import datetime
from src.models import db

class Card(db.Model):
    __tablename__ = 'cards'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relación con asignaciones
    assignments = db.relationship(
        'CardAssignment', back_populates='card', cascade='all, delete-orphan'
    )

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name
        }

# Lista de cartas iniciales
INITIAL_CARDS = [
    'Gano punto gano juego',
    'Restan cambiados de lado',
    'Robo carta',
    'Anulo doble falta',
    'Robo saque',
    'Repetimos el punto',
    'Bloqueo de carta rival'
]

# Función para inicializar las cartas en la base de datos
def initialize_cards():
    from src.models.card import Card
    existing = {c.name for c in Card.query.all()}
    for card_name in INITIAL_CARDS:
        if card_name not in existing:
            db.session.add(Card(name=card_name))
    db.session.commit()
