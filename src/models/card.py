from src.models import db

class Card(db.Model):
    __tablename__ = 'cards'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    description = db.Column(db.Text, nullable=False)
    is_active = db.Column(db.Boolean, default=True)

    # Relación con asignaciones de carta
    assignments = db.relationship(
        'CardAssignment', back_populates='card', cascade='all, delete-orphan'
    )

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'is_active': self.is_active
        }

# Cartas iniciales disponibles
INITIAL_CARDS = [
    'Gano punto gano juego',
    'Restan cambiados de lado',
    'Robo carta',
    'Anulo doble falta',
    'Robo saque',
    'Repetimos el punto',
    'Bloqueo de carta rival'
]

def initialize_cards():
    """
    Inserta en la BBDD las cartas definidas en INITIAL_CARDS
    si no existen aún. Se deja description vacío y is_active=True.
    """
    from src.models.card import Card

    existing = {c.name for c in Card.query.all()}
    for card_name in INITIAL_CARDS:
        if card_name not in existing:
            db.session.add(
                Card(name=card_name, description='', is_active=True)
            )
    db.session.commit()
