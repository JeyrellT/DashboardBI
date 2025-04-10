// data.js - Manejo de datos para la aplicación

/**
 * Objeto global para almacenar todos los datos
 * @type {Object}
 */
const dashboardData = {
    objetivos: null,
    habilidadesGrupo: null,
    habilidadesDetalladas: null,
    clustering: null,
    planCurso: null,
    recomendacionesPedagogicas: null,
    resumenAnalisis: null,
    analisisFactorial: null,
    analisisIrt: null,
    loading: true,
    error: null,
    lastUpdated: null
};

/**
 * Constantes para colores de visualizaciones
 * @type {Array<string>}
 */
const COLORS = [
    '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', 
    '#82ca9d', '#ffc658', '#d53e4f', '#f46d43', '#fdae61',
    '#4e79a7', '#f28e2c', '#e15759', '#76b7b2', '#59a14f',
    '#b07aa1', '#9c755f', '#bab0ab', '#23171b', '#3c5488'
];

/**
 * URLs de los datos JSON (pueden configurarse según entorno)
 * @type {Object}
 */
const DATA_URLS = {
    objetivos: 'data/objetivos_participantes.json',
    habilidadesGrupo: 'data/habilidades_grupo.json',
    clustering: 'data/analisis_clustering.json',
    habilidadesDetalladas: 'data/habilidades_blandas_detalladas.json',
    planCurso: 'data/plan_curso.json',
    recomendacionesPedagogicas: 'data/recomendaciones_pedagogicas.json',
    resumenAnalisis: 'data/resumen_analisis.json',
    analisisFactorial: 'data/analisis_factorial.json',
    analisisIrt: 'data/analisis_irt.json'
};

/**
 * Función principal para cargar todos los datos
 * @returns {Promise<Object>} Promesa que resuelve al objeto dashboardData
 */
async function loadAllData() {
    try {
        console.log('Cargando datos...');
        // Cargar archivos JSON en paralelo para mejor rendimiento
        const [
            objetivosData,
            habilidadesGrupoData,
            clusteringData,
            habilidadesDetalladasData,
            planCursoData,
            recomendacionesPedagogicasData,
            resumenAnalisisData,
            analisisFactorialData,
            analisisIrtData
        ] = await Promise.all([
            fetchJSON(DATA_URLS.objetivos),
            fetchJSON(DATA_URLS.habilidadesGrupo),
            fetchJSON(DATA_URLS.clustering),
            fetchJSON(DATA_URLS.habilidadesDetalladas),
            fetchJSON(DATA_URLS.planCurso),
            fetchJSON(DATA_URLS.recomendacionesPedagogicas),
            fetchJSON(DATA_URLS.resumenAnalisis),
            fetchJSON(DATA_URLS.analisisFactorial),
            fetchJSON(DATA_URLS.analisisIrt)
        ]);
        
        // Guardar datos en el objeto global
        dashboardData.objetivos = objetivosData;
        dashboardData.habilidadesGrupo = habilidadesGrupoData;
        dashboardData.clustering = clusteringData;
        dashboardData.habilidadesDetalladas = habilidadesDetalladasData;
        dashboardData.planCurso = planCursoData;
        dashboardData.recomendacionesPedagogicas = recomendacionesPedagogicasData;
        dashboardData.resumenAnalisis = resumenAnalisisData;
        dashboardData.analisisFactorial = analisisFactorialData;
        dashboardData.analisisIrt = analisisIrtData;
        
        // Actualizar el estado de carga
        dashboardData.loading = false;
        dashboardData.lastUpdated = new Date();
        
        // Actualizar información del encabezado
        updateHeaderStats();
        
        console.log('Datos cargados exitosamente');
        return dashboardData;
    } catch (error) {
        console.error('Error cargando datos:', error);
        dashboardData.error = `Error al cargar los datos: ${error.message}`;
        dashboardData.loading = false;
        throw error;
    }
}

/**
 * Función auxiliar para cargar un archivo JSON
 * @param {string} url - URL del archivo JSON
 * @returns {Promise<Object>} - Promesa que resuelve al objeto JSON
 */
async function fetchJSON(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status} - ${response.statusText} - URL: ${url}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error cargando ${url}:`, error);
        throw new Error(`No se pudo cargar ${url.split('/').pop()}: ${error.message}`);
    }
}

/**
 * Actualiza estadísticas del encabezado
 */
function updateHeaderStats() {
    // Log de depuración para confirmar el valor de participantes
    console.log("DEBUG: Participantes (resumenAnalisis):", dashboardData.resumenAnalisis.data?.participants);
    
    if (!dashboardData.resumenAnalisis || !dashboardData.planCurso) return;

    // Depuración: Imprimir el valor actual de participantes
    console.log('Cantidad de participantes:', dashboardData.resumenAnalisis.data?.participants);

    // Actualizar el texto del encabezado
    const headerStats = document.getElementById('header-stats');
    if (headerStats) {
        headerStats.textContent = `Análisis completo de ${dashboardData.resumenAnalisis.data?.participants || 0} participantes y ${dashboardData.planCurso.modulos?.length || 0} módulos`;
    }
    
    // Actualizar KPIs
    const duracionTotal = document.getElementById('duracion-total');
    if (duracionTotal) {
        duracionTotal.textContent = dashboardData.planCurso.duracion_total || 'N/A';
    }
    
    const totalModulos = document.getElementById('total-modulos');
    if (totalModulos) {
        totalModulos.textContent = dashboardData.planCurso.modulos?.length || 0;
    }
}

/**
 * Función para preparar los datos para las visualizaciones
 * @returns {Object|null} Objeto con datos preparados o null si hay error
 */
function prepareVisualizationData() {
    if (!dashboardData.habilidadesGrupo || !dashboardData.clustering) return null;
    
    try {
        const visualizationData = {};
        
        // 1. Datos para el gráfico radar de habilidades del grupo
        visualizationData.radarData = Object.entries(dashboardData.habilidadesGrupo).map(([skill, info]) => ({
            subject: skill,
            value: Number(parseFloat(info.porcentaje_promedio || 0).toFixed(1)),
            fullMark: 100
        }));
        
        // 2. Distribución de participantes por cluster
        visualizationData.clusterDistribution = Object.entries(dashboardData.clustering.cluster_profiles || {}).map(([id, perfil]) => ({
            name: perfil.nombre_perfil || 'Sin nombre',
            value: (perfil.participantes || []).length
        }));
        visualizationData.clusterDistribution.forEach(item => {
            item.value = Number(parseFloat(item.value).toFixed(1));
        });
        
        // 3. Datos para objetivos más comunes
        visualizationData.objetivosMasComunes = (dashboardData.objetivos?.analisis_objetivos?.mas_comunes || [])
            .filter(([objetivo, count]) => objetivo && count) // Filter out invalid entries
            .map(([objetivo, count]) => ({
                name: objetivo,
                value: count
            }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 7);
        visualizationData.objetivosMasComunes.forEach(item => {
            item.value = Number(parseFloat(item.value).toFixed(1));
        });
        
        // 4. Áreas de interés más comunes
        visualizationData.areasMasComunes = (dashboardData.objetivos?.analisis_areas?.mas_comunes || [])
            .filter(([area, count]) => area && count) // Filter out invalid entries
            .map(([area, count]) => ({
                name: area,
                value: count
            }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 7);
        visualizationData.areasMasComunes.forEach(item => {
            item.value = Number(parseFloat(item.value).toFixed(1));
        });
        
        // 5. Datos para análisis de dificultad por categoría
        const dificultadPorCategoria = {};
        Object.entries(dashboardData.analisisIrt?.categorized_items || {}).forEach(([category, items]) => {
            dificultadPorCategoria[category] = items ? items.length : 0;
        });
        
        visualizationData.dificultadData = Object.entries(dificultadPorCategoria).map(([category, count]) => ({
            name: category,
            value: count
        }));
        visualizationData.dificultadData.forEach(item => {
            item.value = Number(parseFloat(item.value).toFixed(1));
        });
        
        // 6. Secuencia de aprendizaje recomendada
        visualizationData.secuenciaData = (dashboardData.recomendacionesPedagogicas?.secuencia_recomendada || []).map((fase, index) => ({
            id: index + 1,
            fase: fase.fase || 'Sin nombre',
            duracion: fase.duracion_estimada || 'N/A',
            descripcion: fase.descripcion || 'Sin descripción',
            temas: (fase.temas || []).length
        }));
        
        // 7. Datos para el análisis factorial
        visualizationData.factorialComponentsData = dashboardData.analisisFactorial?.factors_skills 
            ? Object.entries(dashboardData.analisisFactorial.factors_skills).map(([factor, skills]) => ({
                factor,
                description: (dashboardData.analisisFactorial.factor_descriptions || {})[factor] || 'Sin descripción',
                skills: (skills || []).map(s => s.skill).join(", "),
                variance: ((dashboardData.analisisFactorial.explained_variance || [])[parseInt(factor.split(' ')[1]) - 1] || 0) * 100
            }))
            : [];
        
        // 8. Datos para el análisis IRT (dificultad de preguntas)
        visualizationData.irtData = Object.entries(dashboardData.analisisIrt?.parameters || {})
            .map(([question, params]) => ({
                question: question.length > 40 ? question.substring(0, 40) + "..." : question,
                difficulty: params?.difficulty || 0,
                discrimination: params?.discrimination || 0,
                category: Object.keys(dashboardData.analisisIrt?.categorized_items || {}).find(
                    category => (dashboardData.analisisIrt?.categorized_items[category] || []).includes(question)
                ) || 'Sin categoría'
            }))
            .sort((a, b) => b.difficulty - a.difficulty);
        
        // 9. Datos para el resumen de análisis
        visualizationData.resumenData = {
            rows: dashboardData.resumenAnalisis?.data?.rows || 0,
            columns: dashboardData.resumenAnalisis?.data?.columns || 0,
            participants: dashboardData.resumenAnalisis?.data?.participants || 0,
            clusters: dashboardData.resumenAnalisis?.clustering?.clusters || 0,
            components: dashboardData.resumenAnalisis?.factor_analysis?.components || 0,
            variance: dashboardData.resumenAnalisis?.factor_analysis?.variance_explained || 0,
            learning_phases: dashboardData.resumenAnalisis?.recommendations?.learning_phases || 0,
            modules: dashboardData.resumenAnalisis?.course_plan?.modules || 0,
            total_sessions: dashboardData.resumenAnalisis?.course_plan?.total_sessions || 0
        };
        
        // 10. Datos para módulos del curso
        visualizationData.modulosData = (dashboardData.planCurso?.modulos || []).map(modulo => ({
            id: modulo.numero || 0,
            nombre: modulo.titulo || 'Sin título',
            descripcion: modulo.descripcion || 'Sin descripción',
            duracion: modulo.duracion || 'N/A',
            sesiones: modulo.sesiones ? modulo.sesiones.length : 0
        }));
        
        // 11. Datos para la visualización de clustering
        visualizationData.clusteringVisualizationData = (dashboardData.clustering?.visualization_data || []).map(item => ({
            ...item,
            fill: COLORS[item.cluster % COLORS.length]
        }));
        
        return visualizationData;
    } catch (error) {
        console.error('Error al preparar datos de visualización:', error);
        return null;
    }
}

/**
 * Función auxiliar para formatear nombres largos
 * @param {string} name - Nombre a formatear
 * @param {number} maxLength - Longitud máxima (por defecto 25)
 * @returns {string} - Nombre formateado
 */
function formatName(name, maxLength = 25) {
    if (!name) return 'Sin nombre';
    if (name.length > maxLength) {
        return name.substring(0, maxLength) + '...';
    }
    return name;
}

/**
 * Función para obtener el color según el nivel
 * @param {string} level - Nivel de habilidad
 * @returns {string} - Color hexadecimal
 */
function getColorByLevel(level) {
    switch (level) {
        case 'bajo':
            return 'var(--nivel-bajo, #ef4444)';
        case 'medio':
            return 'var(--nivel-medio, #f59e0b)';
        case 'alto':
            return 'var(--nivel-alto, #10b981)';
        case 'muy alto':
            return 'var(--nivel-muy-alto, #3b82f6)';
        default:
            return '#6b7280';
    }
}

/**
 * Función para renderizar el nivel de dificultad
 * @param {number} difficulty - Valor de dificultad
 * @returns {string} - HTML para mostrar la dificultad
 */
function renderDifficulty(difficulty) {
    if (difficulty <= -2) return '<span class="badge badge-green">Muy fácil</span>';
    if (difficulty <= 0) return '<span class="badge badge-blue">Fácil</span>';
    if (difficulty <= 1) return '<span class="badge badge-yellow">Medio</span>';
    if (difficulty <= 2) return '<span class="badge badge-red">Difícil</span>';
    return '<span class="badge badge-red">Muy difícil</span>';
}

/**
 * Función para preparar datos de participante específico
 * @param {string} participantId - ID del participante
 * @returns {Object|null} - Datos del participante o null si no existe
 */
function prepareParticipantData(participantId) {
    if (!dashboardData.habilidadesDetalladas || !participantId || !dashboardData.habilidadesDetalladas[participantId]) {
        return null;
    }
    
    try {
        const participantData = {};
        
        // Datos para el gráfico radar del participante seleccionado
        participantData.radarData = Object.entries(dashboardData.habilidadesDetalladas[participantId]).map(([skill, info]) => ({
            subject: skill,
            Participante: Number(parseFloat(info.porcentaje).toFixed(1)),
            Grupo: Number(parseFloat(dashboardData.habilidadesGrupo[skill].porcentaje_promedio).toFixed(1)),
            fullMark: 100
        }));
        
        // Información del participante
        participantData.info = {
            objetivos: dashboardData.objetivos.objetivos_individuales[participantId] || [],
            areas: dashboardData.objetivos.areas_interes_individuales[participantId] || [],
            experiencia: dashboardData.objetivos.experiencia_previa_individual[participantId] || [],
            cluster: dashboardData.clustering.clusters[participantId],
            habilidades: dashboardData.habilidadesDetalladas[participantId]
        };
        
        // Si el participante está en un cluster, agregar info del cluster
        if (participantData.info.cluster !== undefined) {
            participantData.clusterInfo = dashboardData.clustering.cluster_profiles[participantData.info.cluster];
            participantData.clusterRecommendations = dashboardData.clustering.cluster_recommendations[participantData.info.cluster];
        }
        
        return participantData;
    } catch (error) {
        console.error(`Error al preparar datos del participante ${participantId}:`, error);
        return null;
    }
}

/**
 * Obtiene las estadísticas generales del dashboard
 * @returns {Object} - Estadísticas generales
 */
function getDashboardStats() {
    const stats = {
        totalParticipantes: 0,
        totalHabilidades: 0,
        totalModulos: 0,
        totalSesiones: 0,
        totalClusters: 0,
        datosCompletos: false
    };
    
    if (dashboardData.habilidadesDetalladas) {
        stats.totalParticipantes = Object.keys(dashboardData.habilidadesDetalladas).length;
    }
    
    if (dashboardData.habilidadesGrupo) {
        stats.totalHabilidades = Object.keys(dashboardData.habilidadesGrupo).length;
    }
    
    if (dashboardData.planCurso && dashboardData.planCurso.modulos) {
        stats.totalModulos = dashboardData.planCurso.modulos.length;
        stats.totalSesiones = dashboardData.planCurso.modulos.reduce(
            (total, modulo) => total + (modulo.sesiones ? modulo.sesiones.length : 0), 
            0
        );
    }
    
    if (dashboardData.clustering && dashboardData.clustering.cluster_profiles) {
        stats.totalClusters = Object.keys(dashboardData.clustering.cluster_profiles).length;
    }
    
    stats.datosCompletos = !dashboardData.loading && !dashboardData.error;
    
    return stats;
}

/**
 * Busca texto en los datos del dashboard
 * @param {string} searchText - Texto a buscar
 * @returns {Object} - Resultados de la búsqueda
 */
function searchInDashboardData(searchText) {
    if (!searchText || typeof searchText !== 'string' || searchText.trim() === '') {
        return { count: 0, results: [] };
    }
    
    const query = searchText.toLowerCase().trim();
    const results = {
        participantes: [],
        habilidades: [],
        modulos: [],
        otros: [],
        count: 0
    };
    
    // Buscar en participantes
    if (dashboardData.habilidadesDetalladas) {
        Object.keys(dashboardData.habilidadesDetalladas).forEach(id => {
            if (id.toLowerCase().includes(query)) {
                results.participantes.push({
                    id,
                    type: 'participante',
                    label: `Participante ${id}`
                });
                results.count++;
            }
        });
    }
    
    // Buscar en habilidades
    if (dashboardData.habilidadesGrupo) {
        Object.keys(dashboardData.habilidadesGrupo).forEach(skill => {
            if (skill.toLowerCase().includes(query)) {
                results.habilidades.push({
                    id: skill,
                    type: 'habilidad',
                    label: skill
                });
                results.count++;
            }
        });
    }
    
    // Buscar en módulos
    if (dashboardData.planCurso && dashboardData.planCurso.modulos) {
        dashboardData.planCurso.modulos.forEach(modulo => {
            if (
                modulo.titulo.toLowerCase().includes(query) ||
                modulo.descripcion.toLowerCase().includes(query)
            ) {
                results.modulos.push({
                    id: modulo.numero.toString(),
                    type: 'modulo',
                    label: `Módulo ${modulo.numero}: ${modulo.titulo}`
                });
                results.count++;
            }
        });
    }
    
    return {
        results: [...results.participantes, ...results.habilidades, ...results.modulos, ...results.otros],
        count: results.count
    };
}

/**
 * Exporta los datos del dashboard a CSV o JSON
 * @param {string} format - Formato de exportación ('csv' o 'json')
 * @param {string} section - Sección a exportar ('participantes', 'habilidades', etc.)
 * @returns {string|Blob} - Datos exportados
 */
function exportDashboardData(format = 'json', section = 'all') {
    let dataToExport;
    let filename;
    
    // Seleccionar datos según la sección
    switch (section) {
        case 'participantes':
            dataToExport = dashboardData.habilidadesDetalladas;
            filename = 'participantes';
            break;
        case 'habilidades':
            dataToExport = dashboardData.habilidadesGrupo;
            filename = 'habilidades';
            break;
        case 'clustering':
            dataToExport = dashboardData.clustering;
            filename = 'clustering';
            break;
        case 'modulos':
            dataToExport = dashboardData.planCurso.modulos;
            filename = 'modulos';
            break;
        default:
            // Excluir datos grandes o redundantes
            dataToExport = {
                objectives: dashboardData.objetivos,
                groupSkills: dashboardData.habilidadesGrupo,
                course: dashboardData.planCurso,
                summary: dashboardData.resumenAnalisis
            };
            filename = 'dashboard_datos';
    }
    
    // Formatear según el formato seleccionado
    if (format === 'csv' && section !== 'all') {
        // Convertir a CSV (simplificado)
        // Para una implementación real, se necesitaría una lógica más robusta
        return 'Exportación CSV no implementada';
    } else {
        // Exportar como JSON
        const jsonData = JSON.stringify(dataToExport, null, 2);
        const blob = new Blob([jsonData], { type: 'application/json' });
        return blob;
    }
}