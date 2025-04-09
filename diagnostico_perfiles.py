# diagnostico_perfiles.py
import json
import os
import sys

def cargar_json(ruta_archivo):
    """Carga un archivo JSON y devuelve su contenido."""
    try:
        with open(ruta_archivo, 'r', encoding='utf-8') as archivo:
            return json.load(archivo)
    except Exception as e:
        print(f"Error al cargar el archivo JSON: {e}")
        return None

def diagnosticar_perfiles(datos):
    """Diagnostica la estructura del objeto perfiles y prueba accesos."""
    if not datos:
        print("No se pudieron cargar los datos.")
        return
    
    # Verificar estructura básica
    print("\n=== ESTRUCTURA DEL JSON ===")
    print(f"Claves principales: {', '.join(datos.keys())}")
    
    # Verificar si existe 'perfiles'
    if 'perfiles' not in datos:
        print("ERROR: No se encontró la clave 'perfiles' en el JSON.")
        return
    
    perfiles = datos['perfiles']
    total_perfiles = len(perfiles)
    print(f"Total de perfiles encontrados: {total_perfiles}")
    
    # Listar todos los IDs disponibles
    ids = list(perfiles.keys())
    print(f"IDs disponibles: {', '.join(ids[:20])}{'...' if len(ids) > 20 else ''}")
    
    # Probar acceso al participante 10
    print("\n=== PRUEBA DE ACCESO A PARTICIPANTE 10 ===")
    
    # Probar diferentes variantes de clave
    claves_prueba = ["10", 10, "010"]
    for clave in claves_prueba:
        resultado = perfiles.get(str(clave))
        print(f"Búsqueda con clave '{clave}' (tipo: {type(clave).__name__}): {'ÉXITO' if resultado else 'FALLO'}")
        
        # Si encontramos, mostrar detalles
        if resultado:
            print(f"  - ID en el perfil: {resultado.get('id')}")
            print(f"  - Tipo del ID en el perfil: {type(resultado.get('id')).__name__}")
    
    # Verificar estructura detallada del participante 10 si existe
    participante_10 = perfiles.get("10")
    if participante_10:
        print("\n=== ESTRUCTURA DEL PARTICIPANTE 10 ===")
        print(f"Claves del perfil: {', '.join(participante_10.keys())}")
        
        # Verificar id interno
        id_interno = participante_10.get('id')
        print(f"ID interno: {id_interno} (tipo: {type(id_interno).__name__})")
        
        if id_interno != 10 and str(id_interno) != "10":
            print(f"⚠️ ADVERTENCIA: El ID interno ({id_interno}) no coincide con la clave (10)")
    else:
        print("\n⚠️ El participante 10 no existe en el JSON, aunque debería existir según tus indicaciones.")
        
        # Búsqueda aproximada
        print("\n=== BÚSQUEDA APROXIMADA ===")
        for id_perfil in ids:
            if '10' in id_perfil:
                print(f"ID similar encontrado: {id_perfil}")

def main():
    # Intentar encontrar automáticamente el archivo en el directorio actual
    directorio_actual = os.path.dirname(os.path.abspath(__file__))
    posibles_rutas = [
        os.path.join(directorio_actual, "perfiles_analiticos_consolidados.json"),
        os.path.join(directorio_actual, "data", "perfiles_analiticos_consolidados.json"),
        "perfiles_analiticos_consolidados.json",  # Directamente en la raíz
    ]
    
    # Verificar si alguna de estas rutas existe
    ruta_archivo = None
    for ruta in posibles_rutas:
        if os.path.isfile(ruta):
            ruta_archivo = ruta
            print(f"Archivo encontrado automáticamente: {ruta}")
            break
    
    # Si no se encontró automáticamente, obtener del usuario
    if not ruta_archivo:
        if len(sys.argv) > 1:
            ruta_archivo = sys.argv[1]
            print(f"Usando ruta proporcionada como argumento: {ruta_archivo}")
        else:
            print("No se encontró automáticamente el archivo. Por favor, ingresa la ruta completa:")
            ruta_archivo = input(f"Ruta al archivo (debe incluir 'perfiles_analiticos_consolidados.json'): ")
    
    # Verificar si el archivo existe
    if not os.path.isfile(ruta_archivo):
        print(f"ERROR: El archivo {ruta_archivo} no existe.")
        # Intentar listar archivos JSON en el directorio
        try:
            directorio = os.path.dirname(ruta_archivo) or '.'
            print(f"\nArchivos JSON disponibles en {directorio}:")
            for archivo in os.listdir(directorio):
                if archivo.endswith('.json'):
                    print(f"  - {archivo}")
        except Exception as e:
            print(f"No se pudieron listar los archivos: {e}")
        return
    
    print(f"Analizando archivo: {ruta_archivo}")
    # Cargar y diagnosticar
    datos = cargar_json(ruta_archivo)
    diagnosticar_perfiles(datos)

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"\nERROR INESPERADO: {e}")
        import traceback
        traceback.print_exc()
    
    print("\nPresiona Enter para salir...")
    input()  # Mantener la ventana abierta en caso de ejecución directa