#!/usr/bin/env python3
"""
Analizador de Resultados de Pruebas de Carga - Ery App

Este script analiza los resultados generados por Locust y produce
reportes detallados con métricas, gráficos y recomendaciones.

Uso:
    python analyze_load_test_results.py --csv load_test_data_1234567890_stats.csv
    python analyze_load_test_results.py --directory results/ --generate-report
"""

import argparse
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import json
import os
from pathlib import Path
from datetime import datetime
import numpy as np

class LoadTestAnalyzer:
    def __init__(self):
        self.stats_data = None
        self.failures_data = None
        self.history_data = None
        self.report_data = {}
        
        # Configurar estilo de gráficos
        plt.style.use('seaborn-v0_8')
        sns.set_palette("husl")
        
    def load_csv_data(self, csv_file):
        """Cargar datos desde archivo CSV de Locust"""
        try:
            # Cargar estadísticas principales
            if '_stats.csv' in csv_file:
                self.stats_data = pd.read_csv(csv_file)
                print(f"✅ Cargadas estadísticas desde {csv_file}")
                
                # Buscar archivos relacionados
                base_name = csv_file.replace('_stats.csv', '')
                
                failures_file = f"{base_name}_failures.csv"
                if Path(failures_file).exists():
                    self.failures_data = pd.read_csv(failures_file)
                    print(f"✅ Cargados fallos desde {failures_file}")
                    
                history_file = f"{base_name}_stats_history.csv"
                if Path(history_file).exists():
                    self.history_data = pd.read_csv(history_file)
                    print(f"✅ Cargado historial desde {history_file}")
                    
            return True
            
        except Exception as e:
            print(f"❌ Error cargando datos: {e}")
            return False
            
    def analyze_performance_metrics(self):
        """Analizar métricas de rendimiento"""
        if self.stats_data is None:
            return
            
        print("\n📊 Analizando métricas de rendimiento...")
        
        # Filtrar datos (excluir totales)
        data = self.stats_data[self.stats_data['Type'] != 'Aggregated'].copy()
        
        # Métricas clave
        metrics = {
            'total_requests': data['Request Count'].sum(),
            'total_failures': data['Failure Count'].sum(),
            'failure_rate': (data['Failure Count'].sum() / data['Request Count'].sum()) * 100,
            'avg_response_time': data['Average Response Time'].mean(),
            'median_response_time': data['Median Response Time'].mean(),
            'p95_response_time': data['95%'].mean(),
            'p99_response_time': data['99%'].mean(),
            'max_response_time': data['Max Response Time'].max(),
            'min_response_time': data['Min Response Time'].min(),
            'requests_per_second': data['Requests/s'].sum()
        }
        
        self.report_data['metrics'] = metrics
        
        # Análisis por endpoint
        endpoint_analysis = []
        for _, row in data.iterrows():
            endpoint_data = {
                'name': row['Name'],
                'method': row['Type'],
                'requests': row['Request Count'],
                'failures': row['Failure Count'],
                'failure_rate': (row['Failure Count'] / row['Request Count']) * 100 if row['Request Count'] > 0 else 0,
                'avg_time': row['Average Response Time'],
                'median_time': row['Median Response Time'],
                'p95_time': row['95%'],
                'p99_time': row['99%'],
                'rps': row['Requests/s']
            }
            endpoint_analysis.append(endpoint_data)
            
        self.report_data['endpoints'] = endpoint_analysis
        
        return metrics
        
    def analyze_failures(self):
        """Analizar fallos y errores"""
        if self.failures_data is None or self.failures_data.empty:
            print("✅ No se encontraron fallos")
            self.report_data['failures'] = []
            return
            
        print("\n🚨 Analizando fallos...")
        
        failure_analysis = []
        for _, row in self.failures_data.iterrows():
            failure_data = {
                'method': row['Method'],
                'name': row['Name'],
                'error': row['Error'],
                'occurrences': row['Occurrences']
            }
            failure_analysis.append(failure_data)
            
        self.report_data['failures'] = failure_analysis
        
        # Resumen de fallos
        total_failures = self.failures_data['Occurrences'].sum()
        unique_errors = len(self.failures_data)
        
        print(f"   Total de fallos: {total_failures}")
        print(f"   Tipos de error únicos: {unique_errors}")
        
        return failure_analysis
        
    def generate_performance_assessment(self):
        """Generar evaluación de rendimiento"""
        if 'metrics' not in self.report_data:
            return
            
        metrics = self.report_data['metrics']
        assessment = {
            'overall_grade': 'A',
            'issues': [],
            'recommendations': [],
            'strengths': []
        }
        
        # Evaluar tasa de fallos
        if metrics['failure_rate'] > 5:
            assessment['overall_grade'] = 'F'
            assessment['issues'].append(f"Tasa de fallos muy alta: {metrics['failure_rate']:.2f}%")
            assessment['recommendations'].append("Investigar y corregir errores del servidor")
        elif metrics['failure_rate'] > 1:
            assessment['overall_grade'] = 'C'
            assessment['issues'].append(f"Tasa de fallos elevada: {metrics['failure_rate']:.2f}%")
            assessment['recommendations'].append("Revisar logs del servidor para errores")
        else:
            assessment['strengths'].append(f"Baja tasa de fallos: {metrics['failure_rate']:.2f}%")
            
        # Evaluar tiempos de respuesta
        if metrics['p95_response_time'] > 5000:
            assessment['overall_grade'] = 'F'
            assessment['issues'].append(f"Tiempos de respuesta P95 muy altos: {metrics['p95_response_time']:.0f}ms")
            assessment['recommendations'].append("Optimizar consultas de base de datos y lógica del servidor")
        elif metrics['p95_response_time'] > 2000:
            if assessment['overall_grade'] == 'A':
                assessment['overall_grade'] = 'C'
            assessment['issues'].append(f"Tiempos de respuesta P95 altos: {metrics['p95_response_time']:.0f}ms")
            assessment['recommendations'].append("Considerar optimizaciones de rendimiento")
        elif metrics['p95_response_time'] < 500:
            assessment['strengths'].append(f"Excelentes tiempos de respuesta P95: {metrics['p95_response_time']:.0f}ms")
            
        # Evaluar throughput
        if metrics['requests_per_second'] > 100:
            assessment['strengths'].append(f"Alto throughput: {metrics['requests_per_second']:.1f} RPS")
        elif metrics['requests_per_second'] < 10:
            assessment['issues'].append(f"Bajo throughput: {metrics['requests_per_second']:.1f} RPS")
            assessment['recommendations'].append("Investigar cuellos de botella de rendimiento")
            
        self.report_data['assessment'] = assessment
        return assessment
        
    def create_visualizations(self, output_dir='load_test_analysis'):
        """Crear visualizaciones de los resultados"""
        if self.stats_data is None:
            return
            
        print(f"\n📈 Generando visualizaciones en {output_dir}/...")
        
        # Crear directorio de salida
        Path(output_dir).mkdir(exist_ok=True)
        
        # Filtrar datos
        data = self.stats_data[self.stats_data['Type'] != 'Aggregated'].copy()
        
        # 1. Gráfico de tiempos de respuesta por endpoint
        plt.figure(figsize=(12, 8))
        endpoints = data['Name']
        avg_times = data['Average Response Time']
        p95_times = data['95%']
        
        x = np.arange(len(endpoints))
        width = 0.35
        
        plt.bar(x - width/2, avg_times, width, label='Tiempo Promedio', alpha=0.8)
        plt.bar(x + width/2, p95_times, width, label='P95', alpha=0.8)
        
        plt.xlabel('Endpoints')
        plt.ylabel('Tiempo de Respuesta (ms)')
        plt.title('Tiempos de Respuesta por Endpoint')
        plt.xticks(x, endpoints, rotation=45, ha='right')
        plt.legend()
        plt.tight_layout()
        plt.savefig(f'{output_dir}/response_times_by_endpoint.png', dpi=300, bbox_inches='tight')
        plt.close()
        
        # 2. Gráfico de requests por segundo
        plt.figure(figsize=(10, 6))
        plt.bar(endpoints, data['Requests/s'], alpha=0.8, color='skyblue')
        plt.xlabel('Endpoints')
        plt.ylabel('Requests por Segundo')
        plt.title('Throughput por Endpoint')
        plt.xticks(rotation=45, ha='right')
        plt.tight_layout()
        plt.savefig(f'{output_dir}/throughput_by_endpoint.png', dpi=300, bbox_inches='tight')
        plt.close()
        
        # 3. Gráfico de tasa de fallos
        if not data['Failure Count'].sum() == 0:
            failure_rates = (data['Failure Count'] / data['Request Count']) * 100
            
            plt.figure(figsize=(10, 6))
            colors = ['red' if rate > 1 else 'orange' if rate > 0.1 else 'green' for rate in failure_rates]
            plt.bar(endpoints, failure_rates, alpha=0.8, color=colors)
            plt.xlabel('Endpoints')
            plt.ylabel('Tasa de Fallos (%)')
            plt.title('Tasa de Fallos por Endpoint')
            plt.xticks(rotation=45, ha='right')
            plt.tight_layout()
            plt.savefig(f'{output_dir}/failure_rate_by_endpoint.png', dpi=300, bbox_inches='tight')
            plt.close()
            
        # 4. Historial de rendimiento (si está disponible)
        if self.history_data is not None:
            plt.figure(figsize=(12, 8))
            
            # Convertir timestamp a datetime si es necesario
            if 'Timestamp' in self.history_data.columns:
                self.history_data['Timestamp'] = pd.to_datetime(self.history_data['Timestamp'])
                
                plt.subplot(2, 1, 1)
                plt.plot(self.history_data['Timestamp'], self.history_data['Requests/s'], 
                        label='Requests/s', linewidth=2)
                plt.ylabel('Requests por Segundo')
                plt.title('Evolución del Rendimiento en el Tiempo')
                plt.legend()
                plt.grid(True, alpha=0.3)
                
                plt.subplot(2, 1, 2)
                plt.plot(self.history_data['Timestamp'], self.history_data['Average Response Time'], 
                        label='Tiempo Promedio', linewidth=2, color='orange')
                plt.ylabel('Tiempo de Respuesta (ms)')
                plt.xlabel('Tiempo')
                plt.legend()
                plt.grid(True, alpha=0.3)
                
                plt.tight_layout()
                plt.savefig(f'{output_dir}/performance_over_time.png', dpi=300, bbox_inches='tight')
                plt.close()
                
        print(f"✅ Visualizaciones guardadas en {output_dir}/")
        
    def generate_html_report(self, output_file='load_test_report.html'):
        """Generar reporte HTML completo"""
        print(f"\n📄 Generando reporte HTML: {output_file}")
        
        html_template = """
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reporte de Pruebas de Carga - Ery App</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; color: #333; border-bottom: 2px solid #007bff; padding-bottom: 20px; margin-bottom: 30px; }
        .metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric-card { background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #007bff; }
        .metric-value { font-size: 24px; font-weight: bold; color: #007bff; }
        .metric-label { color: #666; font-size: 14px; }
        .grade-A { color: #28a745; }
        .grade-B { color: #ffc107; }
        .grade-C { color: #fd7e14; }
        .grade-F { color: #dc3545; }
        .section { margin: 30px 0; }
        .section h2 { color: #333; border-bottom: 1px solid #ddd; padding-bottom: 10px; }
        .endpoint-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .endpoint-table th, .endpoint-table td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        .endpoint-table th { background-color: #007bff; color: white; }
        .endpoint-table tr:hover { background-color: #f5f5f5; }
        .failure-item { background: #f8d7da; padding: 10px; margin: 5px 0; border-radius: 4px; border-left: 4px solid #dc3545; }
        .recommendation { background: #d1ecf1; padding: 10px; margin: 5px 0; border-radius: 4px; border-left: 4px solid #17a2b8; }
        .strength { background: #d4edda; padding: 10px; margin: 5px 0; border-radius: 4px; border-left: 4px solid #28a745; }
        .timestamp { color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 Reporte de Pruebas de Carga</h1>
            <h2>Ery App - Análisis de Rendimiento</h2>
            <p class="timestamp">Generado el: {timestamp}</p>
        </div>
        
        <div class="section">
            <h2>📊 Resumen Ejecutivo</h2>
            <div class="metric-grid">
                <div class="metric-card">
                    <div class="metric-value">{total_requests:,}</div>
                    <div class="metric-label">Total de Requests</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">{failure_rate:.2f}%</div>
                    <div class="metric-label">Tasa de Fallos</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">{avg_response_time:.0f}ms</div>
                    <div class="metric-label">Tiempo Promedio</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">{p95_response_time:.0f}ms</div>
                    <div class="metric-label">P95 Tiempo Respuesta</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">{requests_per_second:.1f}</div>
                    <div class="metric-label">Requests por Segundo</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value grade-{overall_grade}">{overall_grade}</div>
                    <div class="metric-label">Calificación General</div>
                </div>
            </div>
        </div>
        
        <div class="section">
            <h2>🎯 Evaluación de Rendimiento</h2>
            {assessment_html}
        </div>
        
        <div class="section">
            <h2>📈 Análisis por Endpoint</h2>
            <table class="endpoint-table">
                <thead>
                    <tr>
                        <th>Endpoint</th>
                        <th>Requests</th>
                        <th>Fallos</th>
                        <th>Tasa Fallos</th>
                        <th>Tiempo Prom.</th>
                        <th>P95</th>
                        <th>RPS</th>
                    </tr>
                </thead>
                <tbody>
                    {endpoints_html}
                </tbody>
            </table>
        </div>
        
        {failures_html}
        
        <div class="section">
            <h2>📋 Recomendaciones</h2>
            <p>Basado en el análisis de los resultados, se recomienda:</p>
            <ul>
                <li>Monitorear continuamente los endpoints con mayor tiempo de respuesta</li>
                <li>Implementar caché para endpoints frecuentemente accedidos</li>
                <li>Considerar optimización de consultas de base de datos</li>
                <li>Establecer alertas para tasas de fallo > 1%</li>
                <li>Realizar pruebas de carga regulares durante el desarrollo</li>
            </ul>
        </div>
    </div>
</body>
</html>
        """
        
        # Preparar datos para el template
        metrics = self.report_data.get('metrics', {})
        assessment = self.report_data.get('assessment', {})
        endpoints = self.report_data.get('endpoints', [])
        failures = self.report_data.get('failures', [])
        
        # Generar HTML para evaluación
        assessment_html = ""
        if 'strengths' in assessment:
            for strength in assessment['strengths']:
                assessment_html += f'<div class="strength">✅ {strength}</div>'
        if 'issues' in assessment:
            for issue in assessment['issues']:
                assessment_html += f'<div class="failure-item">⚠️ {issue}</div>'
        if 'recommendations' in assessment:
            for rec in assessment['recommendations']:
                assessment_html += f'<div class="recommendation">💡 {rec}</div>'
                
        # Generar HTML para endpoints
        endpoints_html = ""
        for endpoint in endpoints:
            endpoints_html += f"""
                <tr>
                    <td>{endpoint['name']}</td>
                    <td>{endpoint['requests']:,}</td>
                    <td>{endpoint['failures']}</td>
                    <td>{endpoint['failure_rate']:.2f}%</td>
                    <td>{endpoint['avg_time']:.0f}ms</td>
                    <td>{endpoint['p95_time']:.0f}ms</td>
                    <td>{endpoint['rps']:.1f}</td>
                </tr>
            """
            
        # Generar HTML para fallos
        failures_html = ""
        if failures:
            failures_html = '<div class="section"><h2>🚨 Análisis de Fallos</h2>'
            for failure in failures:
                failures_html += f'<div class="failure-item"><strong>{failure["method"]} {failure["name"]}</strong><br>{failure["error"]} (Ocurrencias: {failure["occurrences"]})</div>'
            failures_html += '</div>'
            
        # Generar HTML final
        html_content = html_template.format(
            timestamp=datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            total_requests=metrics.get('total_requests', 0),
            failure_rate=metrics.get('failure_rate', 0),
            avg_response_time=metrics.get('avg_response_time', 0),
            p95_response_time=metrics.get('p95_response_time', 0),
            requests_per_second=metrics.get('requests_per_second', 0),
            overall_grade=assessment.get('overall_grade', 'N/A'),
            assessment_html=assessment_html,
            endpoints_html=endpoints_html,
            failures_html=failures_html
        )
        
        # Guardar archivo
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(html_content)
            
        print(f"✅ Reporte HTML generado: {output_file}")
        
    def print_summary(self):
        """Imprimir resumen en consola"""
        if 'metrics' not in self.report_data:
            return
            
        metrics = self.report_data['metrics']
        assessment = self.report_data.get('assessment', {})
        
        print("\n" + "="*60)
        print("📊 RESUMEN DE PRUEBAS DE CARGA")
        print("="*60)
        
        print(f"\n🎯 Métricas Principales:")
        print(f"   Total Requests: {metrics['total_requests']:,}")
        print(f"   Tasa de Fallos: {metrics['failure_rate']:.2f}%")
        print(f"   Tiempo Promedio: {metrics['avg_response_time']:.0f}ms")
        print(f"   P95: {metrics['p95_response_time']:.0f}ms")
        print(f"   P99: {metrics['p99_response_time']:.0f}ms")
        print(f"   RPS: {metrics['requests_per_second']:.1f}")
        
        if assessment:
            grade = assessment.get('overall_grade', 'N/A')
            print(f"\n📈 Calificación General: {grade}")
            
            if 'strengths' in assessment and assessment['strengths']:
                print(f"\n✅ Fortalezas:")
                for strength in assessment['strengths']:
                    print(f"   • {strength}")
                    
            if 'issues' in assessment and assessment['issues']:
                print(f"\n⚠️ Problemas Identificados:")
                for issue in assessment['issues']:
                    print(f"   • {issue}")
                    
            if 'recommendations' in assessment and assessment['recommendations']:
                print(f"\n💡 Recomendaciones:")
                for rec in assessment['recommendations']:
                    print(f"   • {rec}")
                    
        print("\n" + "="*60)

def main():
    parser = argparse.ArgumentParser(
        description='Analizador de resultados de pruebas de carga para Ery App'
    )
    
    parser.add_argument('--csv', required=True,
                       help='Archivo CSV con estadísticas de Locust')
    parser.add_argument('--output-dir', default='load_test_analysis',
                       help='Directorio para guardar análisis (default: load_test_analysis)')
    parser.add_argument('--html-report', default='load_test_report.html',
                       help='Nombre del archivo de reporte HTML')
    parser.add_argument('--no-charts', action='store_true',
                       help='No generar gráficos')
    parser.add_argument('--no-html', action='store_true',
                       help='No generar reporte HTML')
    
    args = parser.parse_args()
    
    print("📊 Ery App - Analizador de Pruebas de Carga")
    print("=" * 50)
    
    analyzer = LoadTestAnalyzer()
    
    # Cargar datos
    if not analyzer.load_csv_data(args.csv):
        print("❌ No se pudieron cargar los datos")
        return 1
        
    # Realizar análisis
    analyzer.analyze_performance_metrics()
    analyzer.analyze_failures()
    analyzer.generate_performance_assessment()
    
    # Generar visualizaciones
    if not args.no_charts:
        analyzer.create_visualizations(args.output_dir)
        
    # Generar reporte HTML
    if not args.no_html:
        analyzer.generate_html_report(args.html_report)
        
    # Mostrar resumen
    analyzer.print_summary()
    
    print(f"\n🎉 Análisis completado. Revisa los archivos generados.")
    return 0

if __name__ == '__main__':
    exit(main())