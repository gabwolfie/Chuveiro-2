from flask import Blueprint, jsonify, request, session
from flask_socketio import emit
from src.models.user import db, User, ShowerSession, Notification
from datetime import datetime

user_bp = Blueprint('user', __name__)

def create_notification(user_id, message, notification_type):
    """Criar uma nova notificação"""
    notification = Notification(
        user_id=user_id,
        message=message,
        notification_type=notification_type
    )
    db.session.add(notification)
    db.session.commit()
    return notification

def broadcast_notification(message, notification_type, exclude_user_id=None):
    """Enviar notificação para todos os usuários conectados via SocketIO"""
    from src.main import socketio
    
    # Criar notificação para todos os usuários (exceto o que iniciou a ação)
    users = User.query.filter(User.notifications_enabled == True).all()
    for user in users:
        if exclude_user_id and user.id == exclude_user_id:
            continue
        create_notification(user.id, message, notification_type)
    
    # Enviar via SocketIO
    socketio.emit('notification', {
        'message': message,
        'type': notification_type,
        'timestamp': datetime.utcnow().isoformat()
    })

@user_bp.route('/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        username = data.get('username')
        email = data.get('email')
        phone = data.get('phone', '')
        password = data.get('password')

        if not username or not email or not password:
            return jsonify({'error': 'Todos os campos obrigatórios devem ser preenchidos'}), 400

        # Verificar se usuário já existe
        if User.query.filter_by(username=username).first():
            return jsonify({'error': 'Nome de usuário já existe'}), 400
        
        if User.query.filter_by(email=email).first():
            return jsonify({'error': 'Email já cadastrado'}), 400

        # Criar novo usuário
        user = User(username=username, email=email, phone=phone)
        user.set_password(password)
        
        db.session.add(user)
        db.session.commit()

        return jsonify({'message': 'Usuário cadastrado com sucesso', 'user': user.to_dict()}), 201

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@user_bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        username_or_email = data.get('username')
        password = data.get('password')

        if not username_or_email or not password:
            return jsonify({'error': 'Username/email e senha são obrigatórios'}), 400

        # Buscar usuário por username ou email
        user = User.query.filter(
            (User.username == username_or_email) | (User.email == username_or_email)
        ).first()

        if not user or not user.check_password(password):
            return jsonify({'error': 'Credenciais inválidas'}), 401

        # Criar sessão
        session['user_id'] = user.id
        session['username'] = user.username

        return jsonify({'message': 'Login realizado com sucesso', 'user': user.to_dict()}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@user_bp.route('/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'message': 'Logout realizado com sucesso'}), 200

@user_bp.route('/me', methods=['GET'])
def get_current_user():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'Usuário não autenticado'}), 401

    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'Usuário não encontrado'}), 404

    return jsonify({'user': user.to_dict()}), 200

@user_bp.route('/shower/status', methods=['GET'])
def get_shower_status():
    try:
        # Buscar sessão ativa
        active_session = ShowerSession.query.filter_by(is_active=True).first()
        
        if active_session:
            # Calcular tempo restante
            elapsed_time = (datetime.utcnow() - active_session.start_time).total_seconds() / 60
            remaining_time = max(0, (active_session.estimated_duration or 15) - elapsed_time)
            
            return jsonify({
                'status': 'occupied',
                'user': active_session.user.username,
                'start_time': active_session.start_time.isoformat(),
                'estimated_duration': active_session.estimated_duration,
                'remaining_time': int(remaining_time)
            }), 200
        else:
            return jsonify({'status': 'free'}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@user_bp.route('/shower/start', methods=['POST'])
def start_shower():
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'Usuário não autenticado'}), 401

        data = request.get_json()
        duration = data.get('duration', 15)

        # Verificar se já existe sessão ativa
        active_session = ShowerSession.query.filter_by(is_active=True).first()
        if active_session:
            return jsonify({'error': 'Chuveiro já está em uso'}), 400

        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'Usuário não encontrado'}), 404

        # Criar nova sessão
        session_obj = ShowerSession(
            user_id=user_id,
            estimated_duration=duration,
            is_active=True
        )
        
        db.session.add(session_obj)
        db.session.commit()

        # Enviar notificação para todos os outros usuários
        message = f"🚿 {user.username} começou a usar o chuveiro ({duration} min)"
        broadcast_notification(message, 'shower_start', exclude_user_id=user_id)
        
        # Emitir evento específico para início do chuveiro
        from src.main import socketio
        socketio.emit('shower_started', {
            'username': user.username,
            'duration': duration,
            'timestamp': datetime.utcnow().isoformat()
        }, broadcast=True)

        return jsonify({
            'message': 'Uso do chuveiro iniciado',
            'user': user.username,
            'session': session_obj.to_dict()
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@user_bp.route('/shower/end', methods=['POST'])
def end_shower():
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'Usuário não autenticado'}), 401

        # Buscar sessão ativa do usuário
        active_session = ShowerSession.query.filter_by(
            user_id=user_id, 
            is_active=True
        ).first()

        if not active_session:
            return jsonify({'error': 'Nenhuma sessão ativa encontrada'}), 400

        user = User.query.get(user_id)
        
        # Finalizar sessão
        active_session.end_time = datetime.utcnow()
        active_session.is_active = False
        
        db.session.commit()

        # Enviar notificação para todos os outros usuários
        message = f"✅ {user.username} terminou de usar o chuveiro"
        broadcast_notification(message, 'shower_end', exclude_user_id=user_id)
        
        # Emitir evento específico para finalização do chuveiro
        from src.main import socketio
        socketio.emit('shower_ended', {
            'username': user.username,
            'timestamp': datetime.utcnow().isoformat()
        }, broadcast=True)

        return jsonify({
            'message': 'Uso do chuveiro finalizado',
            'user': user.username,
            'session': active_session.to_dict()
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@user_bp.route('/shower/history', methods=['GET'])
def get_shower_history():
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'Usuário não autenticado'}), 401

        # Buscar histórico das últimas 10 sessões
        sessions = ShowerSession.query.order_by(
            ShowerSession.start_time.desc()
        ).limit(10).all()

        return jsonify({
            'sessions': [session.to_dict() for session in sessions]
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@user_bp.route('/notifications', methods=['GET'])
def get_notifications():
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'Usuário não autenticado'}), 401

        # Buscar notificações não lidas do usuário
        notifications = Notification.query.filter_by(
            user_id=user_id,
            is_read=False
        ).order_by(Notification.created_at.desc()).limit(20).all()

        return jsonify({
            'notifications': [notification.to_dict() for notification in notifications]
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@user_bp.route('/notifications/mark-read', methods=['POST'])
def mark_notifications_read():
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'Usuário não autenticado'}), 401

        # Marcar todas as notificações como lidas
        Notification.query.filter_by(
            user_id=user_id,
            is_read=False
        ).update({'is_read': True})
        
        db.session.commit()

        return jsonify({'message': 'Notificações marcadas como lidas'}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@user_bp.route('/profile/update', methods=['POST'])
def update_profile():
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'Usuário não autenticado'}), 401

        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'Usuário não encontrado'}), 404

        data = request.get_json()
        
        # Atualizar campos permitidos
        if 'phone' in data:
            user.phone = data['phone']
        if 'notifications_enabled' in data:
            user.notifications_enabled = data['notifications_enabled']
        
        db.session.commit()

        return jsonify({
            'message': 'Perfil atualizado com sucesso',
            'user': user.to_dict()
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

