#!/usr/bin/env python3
"""
Script de automatización para pruebas de carga con Locust - Ery App

Este script facilita la ejecución de pruebas de carga automatizadas,
incluyendo validaciones previas y configuraciones predefinidas.

Uso:
    python run_load_tests.py --scenario baseline
    python run_load_tests.py --scenario stress --users 1000
    python run_load_tests.py --custom --users 200 --spawn-rate 10 --time 300
"""

import argparse
import subprocess
import sys
import os
import time
import requests
from pathlib import Path

# Configuraciones predefinidas de escenarios
SCENARIOS = {
    'baseline': {
        'users': 50,
        'spawn_rate': 5,
        'run_time': 300,  # 5 minutos
        'description': 'Prueba baseline para establecer métricas base'
    },
    'normal': {
        'users': 200,
        'spawn_rate': 10,
        'run_time': 600,  # 10 minutos
        'description': 'Simulación de carga normal diaria'
    },
    'peak': {
        'users': 500,
        'spawn_rate': 20,
        'run_time': 900,  # 15 minutos
        'description': 'Simulación de hora pico'
    },
    'stress': {
        'users': 1000,
        'spawn_rate': 50,
        'run_time': 600,  # 10 minutos
        'description': 'Prueba de estrés para encontrar límites'
    },
    'endurance': {
        'users': 200,
        'spawn_rate': 10,
        'run_time': 7200,  # 2 horas
        'description': 'Prueba de resistencia para detectar memory leaks'
    }
}

class LoadTestRunner:
    def __init__(self):
        self.app_url = 'https://ery-app-turso.vercel.app'
        self.locust_file = 'locustfile.py'
        self.users_csv = 'usuarios_prueba.csv'
        
    def check_prerequisites(self):
        """Verificar que todos los prerrequisitos estén cumplidos"""
        print("🔍 Verificando prerrequisitos...")
        
        # Verificar que Locust esté instalado
        try:
            subprocess.run(['locust', '--version'], 
                         capture_output=True, check=True)
            print("✅ Locust está instalado")
        except (subprocess.CalledProcessError, FileNotFoundError):
            print("❌ Locust no está instalado. Ejecuta: pip install locust")
            return False
            
        # Verificar que el archivo locustfile.py exista
        if not Path(self.locust_file).exists():
            print(f"❌ No se encuentra {self.locust_file}")
            return False
        print(f"✅ {self.locust_file} encontrado")
        
        # Verificar que la aplicación esté ejecutándose
        try:
            response = requests.get(self.app_url, timeout=5)
            if response.status_code == 200:
                print(f"✅ Aplicación ejecutándose en {self.app_url}")
            else:
                print(f"⚠️ Aplicación responde con código {response.status_code}")
        except requests.exceptions.RequestException:
            print(f"❌ No se puede conectar a {self.app_url}")
            print("   Asegúrate de que la aplicación esté ejecutándose")
            return False
            
        # Verificar archivo de usuarios (opcional)
        if Path(self.users_csv).exists():
            print(f"✅ {self.users_csv} encontrado")
        else:
            print(f"⚠️ {self.users_csv} no encontrado")
            print("   Se usarán usuarios de prueba por defecto")
            
        return True
        
    def run_scenario(self, scenario_name):
        """Ejecutar un escenario predefinido"""
        if scenario_name not in SCENARIOS:
            print(f"❌ Escenario '{scenario_name}' no existe")
            print(f"Escenarios disponibles: {', '.join(SCENARIOS.keys())}")
            return False
            
        scenario = SCENARIOS[scenario_name]
        print(f"\n🚀 Ejecutando escenario: {scenario_name}")
        print(f"📝 Descripción: {scenario['description']}")
        print(f"👥 Usuarios: {scenario['users']}")
        print(f"⚡ Spawn rate: {scenario['spawn_rate']}/seg")
        print(f"⏱️ Duración: {scenario['run_time']} segundos")
        
        return self.run_custom(
            users=scenario['users'],
            spawn_rate=scenario['spawn_rate'],
            run_time=scenario['run_time']
        )
        
    def run_custom(self, users, spawn_rate, run_time):
        """Ejecutar prueba con parámetros personalizados"""
        print(f"\n🎯 Configuración personalizada:")
        print(f"👥 Usuarios: {users}")
        print(f"⚡ Spawn rate: {spawn_rate}/seg")
        print(f"⏱️ Duración: {run_time} segundos")
        
        # Construir comando de Locust
        cmd = [
            'locust',
            '-f', self.locust_file,
            '--host', self.app_url,
            '--users', str(users),
            '--spawn-rate', str(spawn_rate),
            '--run-time', f'{run_time}s',
            '--headless',  # Ejecutar sin interfaz web
            '--html', f'load_test_report_{int(time.time())}.html',
            '--csv', f'load_test_data_{int(time.time())}'
        ]
        
        print(f"\n🔧 Comando: {' '.join(cmd)}")
        print("\n⏳ Iniciando prueba de carga...")
        print("📊 Los resultados se guardarán en archivos HTML y CSV")
        
        try:
            # Ejecutar Locust
            process = subprocess.Popen(cmd, stdout=subprocess.PIPE, 
                                     stderr=subprocess.STDOUT, 
                                     universal_newlines=True)
            
            # Mostrar salida en tiempo real
            for line in process.stdout:
                print(line.strip())
                
            process.wait()
            
            if process.returncode == 0:
                print("\n✅ Prueba completada exitosamente")
                return True
            else:
                print(f"\n❌ Prueba falló con código {process.returncode}")
                return False
                
        except KeyboardInterrupt:
            print("\n⏹️ Prueba interrumpida por el usuario")
            process.terminate()
            return False
        except Exception as e:
            print(f"\n❌ Error ejecutando prueba: {e}")
            return False
            
    def run_interactive(self):
        """Ejecutar Locust en modo interactivo (con interfaz web)"""
        print("\n🌐 Iniciando Locust en modo interactivo...")
        print(f"📱 Interfaz web disponible en: http://localhost:8089")
        print(f"🎯 Host configurado: {self.app_url}")
        print("\n⚠️ Presiona Ctrl+C para detener")
        
        cmd = ['locust', '-f', self.locust_file, '--host', self.app_url]
        
        try:
            subprocess.run(cmd)
        except KeyboardInterrupt:
            print("\n⏹️ Locust detenido")
            
    def show_scenarios(self):
        """Mostrar todos los escenarios disponibles"""
        print("\n📋 Escenarios de prueba disponibles:\n")
        
        for name, config in SCENARIOS.items():
            print(f"🎯 {name}:")
            print(f"   📝 {config['description']}")
            print(f"   👥 Usuarios: {config['users']}")
            print(f"   ⚡ Spawn rate: {config['spawn_rate']}/seg")
            print(f"   ⏱️ Duración: {config['run_time']}s ({config['run_time']//60}min)")
            print()
            
    def validate_database(self):
        """Validar que la base de datos tenga datos suficientes"""
        print("\n🗄️ Validando datos en la base de datos...")
        
        try:
            # Intentar obtener usuarios desde la API
            response = requests.get(f"{self.app_url}/api/admin/users", timeout=10)
            
            if response.status_code == 401:
                print("⚠️ No se puede validar la base de datos (requiere autenticación)")
                print("   Asegúrate de haber ejecutado: node scripts/seedDatabase.js")
                return True
            elif response.status_code == 200:
                data = response.json()
                user_count = len(data.get('users', []))
                print(f"✅ Base de datos contiene {user_count} usuarios")
                
                if user_count < 100:
                    print("⚠️ Pocos usuarios en la base de datos")
                    print("   Recomendado: ejecutar node scripts/seedDatabase.js")
                    
                return True
            else:
                print(f"⚠️ Respuesta inesperada de la API: {response.status_code}")
                return True
                
        except requests.exceptions.RequestException as e:
            print(f"⚠️ No se puede validar la base de datos: {e}")
            print("   Asegúrate de que la aplicación esté ejecutándose")
            return True

def main():
    parser = argparse.ArgumentParser(
        description='Ejecutor automatizado de pruebas de carga para Ery App',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Ejemplos de uso:
  python run_load_tests.py --scenario baseline
  python run_load_tests.py --scenario stress
  python run_load_tests.py --custom --users 300 --spawn-rate 15 --time 600
  python run_load_tests.py --interactive
  python run_load_tests.py --list-scenarios
        """
    )
    
    # Argumentos principales
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--scenario', choices=SCENARIOS.keys(),
                      help='Ejecutar escenario predefinido')
    group.add_argument('--custom', action='store_true',
                      help='Ejecutar con parámetros personalizados')
    group.add_argument('--interactive', action='store_true',
                      help='Ejecutar en modo interactivo (interfaz web)')
    group.add_argument('--list-scenarios', action='store_true',
                      help='Mostrar escenarios disponibles')
    
    # Argumentos para modo personalizado
    parser.add_argument('--users', type=int, default=100,
                       help='Número de usuarios concurrentes (default: 100)')
    parser.add_argument('--spawn-rate', type=int, default=10,
                       help='Usuarios por segundo (default: 10)')
    parser.add_argument('--time', type=int, default=300,
                       help='Duración en segundos (default: 300)')
    
    # Argumentos opcionales
    parser.add_argument('--skip-checks', action='store_true',
                       help='Omitir verificaciones previas')
    
    args = parser.parse_args()
    
    runner = LoadTestRunner()
    
    # Mostrar escenarios y salir
    if args.list_scenarios:
        runner.show_scenarios()
        return
    
    print("🚀 Ery App - Ejecutor de Pruebas de Carga")
    print("=" * 50)
    
    # Verificar prerrequisitos
    if not args.skip_checks:
        if not runner.check_prerequisites():
            print("\n❌ Faltan prerrequisitos. Usa --skip-checks para omitir")
            sys.exit(1)
            
        runner.validate_database()
    
    # Ejecutar según el modo seleccionado
    success = False
    
    if args.scenario:
        success = runner.run_scenario(args.scenario)
    elif args.custom:
        success = runner.run_custom(args.users, args.spawn_rate, args.time)
    elif args.interactive:
        runner.run_interactive()
        success = True
    
    if success:
        print("\n🎉 Ejecución completada")
    else:
        print("\n💥 Ejecución falló")
        sys.exit(1)

if __name__ == '__main__':
    main()