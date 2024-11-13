import sqlite3
from flask import Flask, render_template, request, redirect, url_for, session, flash, jsonify
from functools import wraps
from dotenv import load_dotenv
import os

# Cargar variables de entorno
load_dotenv()

app = Flask(__name__)
app.secret_key = 'password123'  # Cargar clave secreta desde el archivo .env

# Credenciales de administrador
ADMIN_USERNAME = 'admin'
ADMIN_PASSWORD = 'password123'

# Ruta para proteger el acceso solo al administrador
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'logged_in' not in session:
            flash("Debes iniciar sesión como administrador para acceder.")
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

# Conectar con la base de datos SQLite
def get_db():
    conn = sqlite3.connect('markers.db')
    conn.row_factory = sqlite3.Row  # Para acceder a los resultados como diccionarios
    return conn

# Crear la tabla si no existe
def init_db():
    conn = get_db()
    conn.execute('''CREATE TABLE IF NOT EXISTS markers (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT NOT NULL,
                        description TEXT NOT NULL,
                        lat REAL NOT NULL,
                        lng REAL NOT NULL)''')
    conn.commit()
    conn.close()

# Inicializar la base de datos
init_db()

# Ruta para la página principal
@app.route('/')
def index():
    is_admin = 'logged_in' in session
    
    # Obtener marcadores de la base de datos
    markers = get_markers()  # Cargar marcadores desde SQLite o Firestore
    
    return render_template('index.html', is_admin=is_admin, markers=markers)

# Ruta para iniciar sesión
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        if username == ADMIN_USERNAME and password == ADMIN_PASSWORD:
            session['logged_in'] = True
            flash("Inicio de sesión exitoso!")
            return redirect(url_for('index'))
        else:
            flash("Nombre de usuario o contraseña incorrectos.")
    return render_template('login.html')

# Ruta para cerrar sesión
@app.route('/logout')
def logout():
    session.pop('logged_in', None)
    flash("Has cerrado sesión.")
    return redirect(url_for('index'))

# Ruta para agregar un nuevo marcador a la base de datos
@app.route('/add_marker', methods=['POST'])
@login_required
def add_marker():
    data = request.json
    if not data.get("name") or not data.get("description") or not data.get("lat") or not data.get("lng"):
        return jsonify({"error": "Faltan campos obligatorios"}), 400

    try:
        conn = get_db()
        conn.execute('''INSERT INTO markers (name, description, lat, lng) 
                        VALUES (?, ?, ?, ?)''', 
                     (data['name'], data['description'], data['lat'], data['lng']))
        conn.commit()
        conn.close()
        return jsonify({"message": "Punto agregado exitosamente"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Ruta para obtener todos los marcadores desde la base de datos
@app.route('/get_markers', methods=['GET'])
def get_markers():
    conn = sqlite3.connect('markers.db')  # Conectar a la base de datos SQLite
    cursor = conn.cursor()
    
    # Obtener todos los marcadores
    cursor.execute("SELECT name, description, lat, lng FROM markers")
    markers = cursor.fetchall()
    
    conn.close()
    
    # Convertir los resultados a un formato de lista de diccionarios
    return [{"name": row[0], "description": row[1], "lat": row[2], "lng": row[3]} for row in markers]

# Ruta para eliminar un marcador de la base de datos
@app.route('/delete_marker', methods=['POST'])
def delete_marker():
    marker_data = request.json
    try:
        conn = get_db()
        conn.execute('''DELETE FROM markers WHERE lat = ? AND lng = ?''', 
                     (marker_data['lat'], marker_data['lng']))
        conn.commit()
        conn.close()
        return jsonify({"success": True}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@app.route('/load_markers')
def load_markers():
    markers = get_markers()  # Suponiendo que tienes esta función para obtener los marcadores de la base de datos
    return jsonify(markers)

if __name__ == '__main__':
    app.run(port=3000, debug=True)
