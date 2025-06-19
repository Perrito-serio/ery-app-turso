import time
import random
import csv
from locust import HttpUser, task, between

# --- Datos de Prueba ---
# Leer las credenciales del CSV una sola vez y guardarlas en memoria.
# Esto es más eficiente que leer el archivo en cada tarea.
USERS_CREDENTIALS = []

# Intentar cargar desde usuarios_prueba.csv, si no existe usar datos por defecto
try:
    with open("usuarios_prueba.csv", "r", encoding="utf-8") as f:
        csv_reader = csv.reader(f, delimiter=';')
        next(csv_reader)  # Omitir cabecera
        for row in csv_reader:
            if len(row) >= 2:
                email, password = row[0], row[1]
                USERS_CREDENTIALS.append({"email": email, "password": password})
except FileNotFoundError:
    print("Archivo usuarios_prueba.csv no encontrado. Usando usuarios de prueba por defecto.")
    # Generar usuarios de prueba basados en la información proporcionada
    for i in range(500):
        USERS_CREDENTIALS.append({
            "email": f"muser{i}@tecsup.edu.pe",
            "password": "password123"
        })

# Credenciales de administrador para pruebas
ADMIN_CREDENTIALS = [
    {"email": "admin@tecsup.edu.pe", "password": "admin123"},
    {"email": "wilkidblox@hotmail.com", "password": "123456789"}
]

print(f"Cargadas {len(USERS_CREDENTIALS)} credenciales de usuarios estándar")
print(f"Configuradas {len(ADMIN_CREDENTIALS)} credenciales de administrador")

class EryAppUser(HttpUser):
    """
    Usuario estándar que simula el comportamiento típico de la aplicación:
    - Revisar dashboard
    - Ver hábitos
    - Registrar progreso de hábitos
    """
    # Los usuarios virtuales esperarán entre 1 y 5 segundos entre tareas
    wait_time = between(1, 5)
    weight = 8  # 80% de los usuarios serán usuarios estándar
    
    def on_start(self):
        """Se ejecuta una vez por cada usuario virtual al iniciar. Ideal para el login."""
        if not USERS_CREDENTIALS:
            print("No hay credenciales de usuarios disponibles")
            return
            
        credentials = random.choice(USERS_CREDENTIALS)
        self.email = credentials["email"]
        self.password = credentials["password"]
        self.user_habits = []  # Para almacenar los hábitos del usuario
        
        # Realizar login
        self.login()
        
        # Obtener hábitos del usuario para usar en las tareas
        self.fetch_user_habits()
        
    def login(self):
        """Proceso de autenticación con NextAuth"""
        try:
            # 1. Obtener el token CSRF (necesario para el login con credenciales en NextAuth)
            with self.client.get("/api/auth/csrf", catch_response=True) as response:
                if response.status_code == 200:
                    csrf_token = response.json().get("csrfToken")
                else:
                    print(f"Error obteniendo CSRF token: {response.status_code}")
                    return

            # 2. Iniciar sesión
            login_payload = {
                "email": self.email,
                "password": self.password,
                "csrfToken": csrf_token,
                "json": "true"
            }
            
            with self.client.post("/api/auth/callback/credentials", 
                                json=login_payload, 
                                catch_response=True) as response:
                if response.status_code in [200, 302]:  # 302 es redirect después de login exitoso
                    print(f"Login exitoso para {self.email}")
                else:
                    print(f"Error en login para {self.email}: {response.status_code}")
                    
        except Exception as e:
            print(f"Excepción durante login: {e}")
            
    def fetch_user_habits(self):
        """Obtener los hábitos del usuario para usar en las pruebas"""
        try:
            with self.client.get("/api/habits", catch_response=True) as response:
                if response.status_code == 200:
                    habits_data = response.json()
                    if isinstance(habits_data, dict) and 'habits' in habits_data:
                        self.user_habits = habits_data['habits']
                    elif isinstance(habits_data, list):
                        self.user_habits = habits_data
                    print(f"Usuario {self.email} tiene {len(self.user_habits)} hábitos")
                else:
                    print(f"Error obteniendo hábitos: {response.status_code}")
        except Exception as e:
            print(f"Excepción obteniendo hábitos: {e}")
    
    # --- Tareas Principales ---
    
    @task(5)  # Esta tarea se ejecutará 5 veces más que las otras
    def view_dashboard(self):
        """Tarea más común: el usuario revisa su dashboard."""
        with self.client.get("/api/dashboard", 
                           catch_response=True, 
                           name="/api/dashboard (User)") as response:
            if response.status_code != 200:
                response.failure(f"Dashboard failed: {response.status_code}")

    @task(3)
    def view_my_dashboard_page(self):
        """Usuario accede a la página de su dashboard personal."""
        with self.client.get("/my-dashboard", 
                           catch_response=True, 
                           name="/my-dashboard (Page)") as response:
            if response.status_code != 200:
                response.failure(f"My Dashboard page failed: {response.status_code}")

    @task(2)
    def view_habits(self):
        """Tarea común: el usuario revisa su lista de hábitos."""
        with self.client.get("/api/habits", 
                           catch_response=True, 
                           name="/api/habits (User)") as response:
            if response.status_code != 200:
                response.failure(f"Habits API failed: {response.status_code}")
                
    @task(2)
    def view_habits_page(self):
        """Usuario accede a la página de gestión de hábitos."""
        with self.client.get("/habits", 
                           catch_response=True, 
                           name="/habits (Page)") as response:
            if response.status_code != 200:
                response.failure(f"Habits page failed: {response.status_code}")
        
    @task(1)
    def log_habit_progress(self):
        """Simula registrar el progreso de un hábito del usuario."""
        if not self.user_habits:
            # Si no tenemos hábitos reales, usar un ID aleatorio
            habito_id = random.randint(1, 100)
        else:
            # Usar un hábito real del usuario
            habit = random.choice(self.user_habits)
            habito_id = habit.get('id', random.randint(1, 100))
            
        # Generar datos de progreso realistas según el tipo de hábito
        log_payload = {
            "habito_id": habito_id,
            "fecha_registro": "2024-10-26",
            "valor_booleano": random.choice([True, False]),
            "valor_numerico": random.randint(1, 10) if random.choice([True, False]) else None
        }
        
        with self.client.post("/api/habits/log", 
                            json=log_payload, 
                            catch_response=True,
                            name="/api/habits/log") as response:
            if response.status_code not in [200, 201]:
                response.failure(f"Habit log failed: {response.status_code}")
                
    @task(1)
    def create_habit(self):
        """Simula la creación de un nuevo hábito."""
        habit_types = ["SI_NO", "MEDIBLE_NUMERICO", "MAL_HABITO"]
        habit_names = [
            "Beber agua", "Hacer ejercicio", "Leer", "Meditar", "Estudiar",
            "Caminar", "Escribir", "Cocinar", "Dormir temprano", "Llamar familia"
        ]
        
        new_habit = {
            "nombre": f"{random.choice(habit_names)} - Test {random.randint(1, 1000)}",
            "descripcion": "Hábito creado durante prueba de carga",
            "tipo": random.choice(habit_types),
            "objetivo_diario": random.randint(1, 5) if random.choice([True, False]) else None
        }
        
        with self.client.post("/api/habits", 
                            json=new_habit, 
                            catch_response=True,
                            name="/api/habits (Create)") as response:
            if response.status_code not in [200, 201]:
                response.failure(f"Habit creation failed: {response.status_code}")

class AdminUser(HttpUser):
    """
    Usuario administrador con comportamiento diferente:
    - Gestión de usuarios
    - Consultas administrativas
    - Moderación
    """
    wait_time = between(3, 10)  # Los admins pueden ser menos frecuentes
    weight = 2  # 20% de los usuarios serán administradores
    
    def on_start(self):
        """Login como admin."""
        if not ADMIN_CREDENTIALS:
            print("No hay credenciales de administrador disponibles")
            return
            
        credentials = random.choice(ADMIN_CREDENTIALS)
        self.email = credentials["email"]
        self.password = credentials["password"]
        
        # Realizar login
        self.login()
        
    def login(self):
        """Proceso de autenticación para administrador"""
        try:
            # 1. Obtener el token CSRF
            with self.client.get("/api/auth/csrf", catch_response=True) as response:
                if response.status_code == 200:
                    csrf_token = response.json().get("csrfToken")
                else:
                    print(f"Error obteniendo CSRF token para admin: {response.status_code}")
                    return

            # 2. Iniciar sesión
            login_payload = {
                "email": self.email,
                "password": self.password,
                "csrfToken": csrf_token,
                "json": "true"
            }
            
            with self.client.post("/api/auth/callback/credentials", 
                                json=login_payload, 
                                catch_response=True) as response:
                if response.status_code in [200, 302]:
                    print(f"Login exitoso para admin {self.email}")
                else:
                    print(f"Error en login para admin {self.email}: {response.status_code}")
                    
        except Exception as e:
            print(f"Excepción durante login de admin: {e}")
        
    @task(4)
    def view_user_list(self):
        """La tarea principal de un admin: consultar la lista de usuarios."""
        with self.client.get("/api/admin/users", 
                           catch_response=True,
                           name="/api/admin/users (Admin)") as response:
            if response.status_code != 200:
                response.failure(f"Admin users API failed: {response.status_code}")
                
    @task(3)
    def view_admin_users_page(self):
        """Admin accede a la página de gestión de usuarios."""
        with self.client.get("/admin/users", 
                           catch_response=True,
                           name="/admin/users (Page)") as response:
            if response.status_code != 200:
                response.failure(f"Admin users page failed: {response.status_code}")
                
    @task(2)
    def view_moderate_page(self):
        """Admin/Moderador accede a la página de moderación."""
        with self.client.get("/moderate", 
                           catch_response=True,
                           name="/moderate (Page)") as response:
            if response.status_code != 200:
                response.failure(f"Moderate page failed: {response.status_code}")
                
    @task(1)
    def toggle_user_status(self):
        """Simula activar/desactivar un usuario."""
        # Usar un ID de usuario aleatorio para la prueba
        user_id = random.randint(1, 500)
        toggle_payload = {
            "activo": random.choice([True, False])
        }
        
        with self.client.put(f"/api/admin/users/{user_id}/toggle-active", 
                           json=toggle_payload, 
                           catch_response=True,
                           name="/api/admin/users/toggle-active") as response:
            if response.status_code not in [200, 404]:  # 404 es aceptable si el usuario no existe
                response.failure(f"Toggle user status failed: {response.status_code}")

# Configuración adicional para la prueba
class WebsiteUser(HttpUser):
    """
    Usuario que solo navega por las páginas públicas
    """
    wait_time = between(2, 8)
    weight = 1  # Pocos usuarios solo navegando
    
    @task(3)
    def view_home_page(self):
        """Visitar la página principal."""
        with self.client.get("/", 
                           catch_response=True,
                           name="/ (Home)") as response:
            if response.status_code != 200:
                response.failure(f"Home page failed: {response.status_code}")
                
    @task(2)
    def view_login_page(self):
        """Visitar la página de login."""
        with self.client.get("/login", 
                           catch_response=True,
                           name="/login (Page)") as response:
            if response.status_code != 200:
                response.failure(f"Login page failed: {response.status_code}")
                
    @task(1)
    def view_register_page(self):
        """Visitar la página de registro."""
        with self.client.get("/register", 
                           catch_response=True,
                           name="/register (Page)") as response:
            if response.status_code != 200:
                response.failure(f"Register page failed: {response.status_code}")