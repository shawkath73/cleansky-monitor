from flask import Blueprint, request, jsonify
from services.database import (
    create_user, get_user_by_email,
    get_user_by_id, update_user_preferences,
    get_user_alerts
)
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
import os
from datetime import datetime, timedelta
from bson import ObjectId

user_bp = Blueprint('users', __name__)
JWT_SECRET = os.getenv('JWT_SECRET', 'cleansky_secret_key')


# Register 
@user_bp.route('/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        name     = data.get('name')
        email    = data.get('email')
        password = data.get('password')
        phone    = data.get('phone', None)

        if not all([name, email, password]):
            return jsonify({'success': False, 'error': 'Name, email and password required'}), 400

        hashed = generate_password_hash(password)
        user_id = create_user(name, email, hashed, phone)

        return jsonify({
            'success': True,
            'message': 'User registered successfully!',
            'user_id': user_id
        }), 201

    except ValueError as e:
        return jsonify({'success': False, 'error': str(e)}), 409
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# Login
@user_bp.route('/login', methods=['POST'])
def login():
    try:
        data     = request.get_json()
        email    = data.get('email')
        password = data.get('password')

        if not all([email, password]):
            return jsonify({'success': False, 'error': 'Email and password required'}), 400

        user = get_user_by_email(email)
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 404

        if not check_password_hash(user['password'], password):
            return jsonify({'success': False, 'error': 'Invalid password'}), 401

        # Generate JWT token
        token = jwt.encode({
            'user_id': str(user['_id']),
            'email':   email,
            'exp':     datetime.utcnow() + timedelta(days=7)
        }, JWT_SECRET, algorithm='HS256')

        return jsonify({
            'success': True,
            'token':   token,
            'user': {
                'user_id':         str(user['_id']),
                'name':            user['name'],
                'email':           user['email'],
                'alert_threshold': user.get('alert_threshold', 150),
                'preferences':     user.get('preferences', {})
            }
        }), 200

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# Update Preferences
@user_bp.route('/preferences', methods=['GET', 'PUT'])
def preferences():
    try:
        # Get token from header
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        if not token:
            return jsonify({'success': False, 'error': 'Token required'}), 401

        payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
        user_id = payload['user_id']

        if request.method == 'GET':
            user = get_user_by_id(user_id)
            if not user:
                return jsonify({'success': False, 'error': 'User not found'}), 404
            return jsonify({
                'success': True,
                'preferences': {
                    'alert_threshold': user.get('alert_threshold', 150),
                    'city':            user.get('preferences', {}).get('city', 'Delhi'),
                    'notifications':   user.get('preferences', {}).get('notifications', True)
                }
            }), 200

        elif request.method == 'PUT':
            data    = request.get_json()
            updated = update_user_preferences(user_id, data)
            return jsonify({
                'success': True,
                'message': 'Preferences updated!',
                'updated': updated
            }), 200

    except jwt.ExpiredSignatureError:
        return jsonify({'success': False, 'error': 'Token expired'}), 401
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# User Alerts 
@user_bp.route('/alerts', methods=['GET'])
def alerts():
    try:
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        if not token:
            return jsonify({'success': False, 'error': 'Token required'}), 401

        payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
        user_id = payload['user_id']

        user_alerts = get_user_alerts(user_id, limit=20)

        # Convert datetime objects to strings
        for alert in user_alerts:
            if 'sent_time' in alert:
                alert['sent_time'] = str(alert['sent_time'])

        return jsonify({
            'success': True,
            'alerts':  user_alerts,
            'total':   len(user_alerts)
        }), 200

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500