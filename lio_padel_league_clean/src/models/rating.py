from datetime import datetime
from src.models import db

class PlayerRating(db.Model):
    __tablename__ = 'player_ratings'
    
    id = db.Column(db.Integer, primary_key=True)
    match_id = db.Column(db.Integer, db.ForeignKey('matches.id'), nullable=False)
    rater_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    rated_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    rating = db.Column(db.Integer, nullable=False)  # 1-10
    comment = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relaciones
    match = db.relationship('Match', back_populates='ratings')
    rater = db.relationship('User', foreign_keys=[rater_id], back_populates='ratings_given')
    rated = db.relationship('User', foreign_keys=[rated_id], back_populates='ratings_received')
    
    # Restricción única para evitar valoraciones duplicadas
    __table_args__ = (db.UniqueConstraint('match_id', 'rater_id', 'rated_id', name='unique_rating'),)
    
    def to_dict(self):
        return {
            'id': self.id,
            'match_id': self.match_id,
            'rater_id': self.rater_id,
            'rated_id': self.rated_id,
            'rating': self.rating,
            'comment': self.comment,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class MatchPhoto(db.Model):
    __tablename__ = 'match_photos'
    
    id = db.Column(db.Integer, primary_key=True)
    match_id = db.Column(db.Integer, db.ForeignKey('matches.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    file_path = db.Column(db.String(255), nullable=False)
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relaciones
    match = db.relationship('Match', back_populates='photos')
    user = db.relationship('User')
    
    def to_dict(self):
        return {
            'id': self.id,
            'match_id': self.match_id,
            'user_id': self.user_id,
            'file_path': self.file_path,
            'uploaded_at': self.uploaded_at.isoformat() if self.uploaded_at else None
        }
