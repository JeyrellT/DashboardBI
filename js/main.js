// main.js - Lógica principal de la aplicación

/**
 * Variables globales
 * @type {Object}
 */
const app = {
    currentView: 'general',
    currentSubview: 'clustering',
    selectedParticipant: null,
    selectedModule: null,
    animationInProgress: false,
    DOM: {}, // Contendrá todas las referencias a elementos DOM
    tabViews: ['general', 'individual', 'curso', 'analitica'],
    subViews: {
        analitica: ['clustering', 'factorial', 'irt', 'pedagogicas']
    }
};

// Initialize perfilesAnaliticos globally to prevent "not defined" errors
window.perfilesAnaliticos = { perfiles: {} };

// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Inicializando aplicación...');
    try {
        // Inicializar referencias DOM
        initDOMReferences();
        
        // Configurar event listeners
        setupEventListeners();
        
        // Intentar cargar datos de localStorage primero (caché)
        const cachedData = localStorage.getItem('dashboardData');
        if (cachedData) {
            try {
                console.log('Usando datos en caché...');
                Object.assign(dashboardData, JSON.parse(cachedData));
                dashboardData.loading = false;
                updateHeaderStats();
                renderView(app.currentView);
            } catch (e) {
                console.warn('Error al cargar datos en caché:', e);
                // Si falla, cargamos de la API
                await loadAllDataWithRetry();
            }
        } else {
            // Cargar todos los datos con reintentos
            await loadAllDataWithRetry();
        }
    } catch (error) {
        console.error('Error durante la inicialización:', error);
        showErrorMessage('No se pudo inicializar la aplicación. Por favor, recarga la página.');
    }
});

/**
 * Inicializa todas las referencias DOM necesarias
 */
function initDOMReferences() {
    // Tabs principales
    app.DOM.tabs = {};
    app.tabViews.forEach(view => {
        app.DOM.tabs[view] = document.getElementById(`tab-${view}`);
    });
    
    // Contenedores
    app.DOM.selectorContainer = document.getElementById('selector-container');
    app.DOM.subtabsContainer = document.getElementById('subtabs-container');
    app.DOM.dashboardContent = document.getElementById('dashboard-content');
    
    // Elementos de header
    app.DOM.headerStats = document.getElementById('header-stats');
    app.DOM.duracionTotal = document.getElementById('duracion-total');
    app.DOM.totalModulos = document.getElementById('total-modulos');
}

/**
 * Carga datos con reintentos
 */
async function loadAllDataWithRetry(maxRetries = 3) {
    let retries = 0;
    let success = false;
    
    while (!success && retries < maxRetries) {
        try {
            showLoadingIndicator(true);
            await loadAllData();
            success = true;
            showLoadingIndicator(false);
            
            // Guardar en localStorage para futuras cargas rápidas
            try {
                const dataToCache = {...dashboardData};
                // No guardar estado de carga
                delete dataToCache.loading;
                delete dataToCache.error;
                localStorage.setItem('dashboardData', JSON.stringify(dataToCache));
            } catch (e) {
                console.warn('No se pudo guardar en caché:', e);
            }
            
            // Renderizar la vista inicial
            renderView(app.currentView);
        } catch (error) {
            retries++;
            console.error(`Error cargando datos (intento ${retries}/${maxRetries}):`, error);
            
            if (retries >= maxRetries) {
                showErrorMessage(`No se pudieron cargar los datos después de ${maxRetries} intentos. ${error.message}`);
                showLoadingIndicator(false);
            } else {
                await new Promise(resolve => setTimeout(resolve, 1000 * retries)); // Espera exponencial
            }
        }
    }
}

/**
 * Configura todos los event listeners de la aplicación
 */
function setupEventListeners() {
    // Tab clicks
    for (const [view, element] of Object.entries(app.DOM.tabs)) {
        if (element) {
            element.addEventListener('click', () => {
                if (app.animationInProgress) return;
                changeView(view);
            });
        }
    }
    
    // Responsive breakpoint detection
    window.addEventListener('resize', handleResize);
    
    // Manejo del botón de volver atrás
    window.addEventListener('popstate', handlePopState);
    
    // Escuchar teclas para navegación accesible
    document.addEventListener('keydown', handleKeyboardNavigation);
}

/**
 * Maneja eventos de teclado para navegación accesible
 * @param {KeyboardEvent} e - Evento de teclado
 */
function handleKeyboardNavigation(e) {
    // Navegación por pestañas con teclas de flecha cuando se enfocan los tabs
    if (e.target.classList.contains('tab-button') || e.target.classList.contains('subtab-button')) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
            e.preventDefault();
            const buttons = [...e.target.parentElement.children].filter(
                el => el.tagName === 'BUTTON'
            );
            const currentIndex = buttons.indexOf(e.target);
            let nextIndex;
            
            if (e.key === 'ArrowRight') {
                nextIndex = (currentIndex + 1) % buttons.length;
            } else {
                nextIndex = (currentIndex - 1 + buttons.length) % buttons.length;
            }
            
            buttons[nextIndex].focus();
            buttons[nextIndex].click();
        }
    }
}

/**
 * Maneja el evento de cambio de tamaño de la ventana
 */
function handleResize() {
    // Ajustes responsivos específicos pueden implementarse aquí
    const isMobile = window.innerWidth <= 768;
    
    // Ajustar UI basado en tamaño de pantalla
    if (isMobile) {
        // Simplificar UI en dispositivos móviles
    }
}

/**
 * Maneja el evento de historial del navegador
 */
function handlePopState(event) {
    if (event.state) {
        // Restaurar estado de la aplicación desde el historial
        const state = event.state;
        app.currentView = state.view || 'general';
        app.currentSubview = state.subview || 'clustering';
        app.selectedParticipant = state.participant;
        app.selectedModule = state.module;
        
        // Actualizar UI para reflejar el estado restaurado
        updateActiveTab();
        updateSelectors();
        renderView(app.currentView);
    }
}

/**
 * Muestra u oculta el indicador de carga
 * @param {boolean} show - Mostrar u ocultar el indicador
 */
function showLoadingIndicator(show) {
    if (!app.DOM.dashboardContent) return;
    
    if (show) {
        app.DOM.dashboardContent.innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <p>Cargando datos del dashboard...</p>
            </div>
        `;
    }
}

/**
 * Muestra un mensaje de error
 * @param {string} message - Mensaje de error
 */
function showErrorMessage(message) {
    if (!app.DOM.dashboardContent) return;
    
    app.DOM.dashboardContent.innerHTML = `
        <div class="error-container">
            <h2>Error</h2>
            <p>${message}</p>
            <button class="tab-button primary" onclick="window.location.reload()">
                Reintentar
            </button>
        </div>
    `;
}

/**
 * Cambia la vista actual
 * @param {string} newView - Nueva vista a mostrar
 */
function changeView(newView) {
    if (app.currentView === newView) return;
    
    // Guardar el estado anterior en el historial del navegador
    const previousState = {
        view: app.currentView,
        subview: app.currentSubview,
        participant: app.selectedParticipant,
        module: app.selectedModule
    };
    
    window.history.pushState(
        previousState,
        '',
        `?view=${newView}${app.selectedParticipant ? `&participant=${app.selectedParticipant}` : ''}${app.selectedModule ? `&module=${app.selectedModule}` : ''}`
    );
    
    // Animación de transición
    app.animationInProgress = true;
    app.DOM.dashboardContent.style.opacity = '0';
    
    setTimeout(() => {
        // Actualizar tab activo
        updateActiveTab(newView);
        
        // Actualizar vista actual
        app.currentView = newView;
        
        // Mostrar u ocultar selectores y subtabs según la vista
        updateSelectors();
        
        // Renderizar la nueva vista
        renderView(newView);
        
        // Restaurar opacidad con transición
        setTimeout(() => {
            app.DOM.dashboardContent.style.opacity = '1';
            app.animationInProgress = false;
        }, 50);
    }, 300);
}

/**
 * Actualiza el estado visual de los tabs
 * @param {string} [newView] - La nueva vista a activar
 */
function updateActiveTab(newView = app.currentView) {
    // Actualizar tab activo
    for (const [view, element] of Object.entries(app.DOM.tabs)) {
        if (element) {
            if (view === newView) {
                element.classList.add('active');
                element.setAttribute('aria-selected', 'true');
            } else {
                element.classList.remove('active');
                element.setAttribute('aria-selected', 'false');
            }
        }
    }
}

/**
 * Actualiza selectores y subtabs según la vista actual
 */
function updateSelectors() {
    if (!app.DOM.selectorContainer || !app.DOM.subtabsContainer) return;
    
    app.DOM.selectorContainer.innerHTML = '';
    app.DOM.selectorContainer.classList.remove('visible');
    
    app.DOM.subtabsContainer.innerHTML = '';
    app.DOM.subtabsContainer.classList.remove('visible');
    
    if (app.currentView === 'individual') {
        // Selector de participante
        createParticipantSelector();
    } 
    else if (app.currentView === 'curso') {
        // Selector de módulo
        createModuleSelector();
    }
    else if (app.currentView === 'analitica') {
        // Subtabs para analítica
        createAnalyticsSubtabs();
    }
}

/**
 * Crea el selector de participantes
 */
function createParticipantSelector() {
    app.DOM.selectorContainer.classList.add('visible');
    
    const selectParticipant = document.createElement('select');
    selectParticipant.id = 'select-participant';
    selectParticipant.setAttribute('aria-label', 'Seleccionar participante');
    
    // Opción por defecto
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Seleccionar participante';
    selectParticipant.appendChild(defaultOption);
    
    // Opciones de participantes
    if (dashboardData.habilidadesDetalladas) {
        Object.keys(dashboardData.habilidadesDetalladas).forEach(id => {
            const option = document.createElement('option');
            option.value = id;
            option.textContent = `Participante ${id}`;
            if (id === app.selectedParticipant) {
                option.selected = true;
            }
            selectParticipant.appendChild(option);
        });
    }
    
    selectParticipant.addEventListener('change', (e) => {
        app.selectedParticipant = e.target.value;
        
        // Actualizar URL sin recargar la página
        const url = new URL(window.location);
        if (app.selectedParticipant) {
            url.searchParams.set('participant', app.selectedParticipant);
        } else {
            url.searchParams.delete('participant');
        }
        window.history.pushState({}, '', url);
        
        renderView(app.currentView);
    });
    
    app.DOM.selectorContainer.appendChild(selectParticipant);
}

/**
 * Crea el selector de módulos
 */
function createModuleSelector() {
    app.DOM.selectorContainer.classList.add('visible');
    
    const selectModule = document.createElement('select');
    selectModule.id = 'select-module';
    selectModule.setAttribute('aria-label', 'Seleccionar módulo');
    
    // Opción por defecto
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Seleccionar módulo';
    selectModule.appendChild(defaultOption);
    
    // Opciones de módulos
    if (dashboardData.planCurso && dashboardData.planCurso.modulos) {
        dashboardData.planCurso.modulos.forEach(modulo => {
            const option = document.createElement('option');
            option.value = modulo.numero.toString();
            option.textContent = `Módulo ${modulo.numero}: ${modulo.titulo}`;
            if (modulo.numero.toString() === app.selectedModule) {
                option.selected = true;
            }
            selectModule.appendChild(option);
        });
    }
    
    selectModule.addEventListener('change', (e) => {
        app.selectedModule = e.target.value;
        
        // Actualizar URL sin recargar la página
        const url = new URL(window.location);
        if (app.selectedModule) {
            url.searchParams.set('module', app.selectedModule);
        } else {
            url.searchParams.delete('module');
        }
        window.history.pushState({}, '', url);
        
        renderView(app.currentView);
    });
    
    app.DOM.selectorContainer.appendChild(selectModule);
}

/**
 * Crea las subtabs para la vista analítica
 */
function createAnalyticsSubtabs() {
    app.DOM.subtabsContainer.classList.add('visible');
    
    const subtabs = [
        { id: 'clustering', text: 'Clustering', icon: 'fa-users-viewfinder' },
        { id: 'factorial', text: 'Análisis Factorial', icon: 'fa-cubes' },
        { id: 'irt', text: 'Análisis IRT', icon: 'fa-chart-line' },
        { id: 'pedagogicas', text: 'Recomendaciones', icon: 'fa-lightbulb' }
    ];
    
    subtabs.forEach(subtab => {
        const button = document.createElement('button');
        button.id = `subtab-${subtab.id}`;
        button.classList.add('subtab-button');
        button.setAttribute('aria-label', subtab.text);
        
        if (subtab.id === app.currentSubview) {
            button.classList.add('active');
            button.setAttribute('aria-selected', 'true');
        } else {
            button.setAttribute('aria-selected', 'false');
        }
        
        // Agregar icono (si se incluye Font Awesome)
        if (subtab.icon) {
            button.innerHTML = `<i class="fas ${subtab.icon}"></i> ${subtab.text}`;
        } else {
            button.textContent = subtab.text;
        }
        
        button.addEventListener('click', () => {
            if (app.animationInProgress) return;
            
            // Actualizar subtab activo
            document.querySelectorAll('.subtab-button').forEach(btn => {
                btn.classList.remove('active');
                btn.setAttribute('aria-selected', 'false');
            });
            button.classList.add('active');
            button.setAttribute('aria-selected', 'true');
            
            // Animación de transición
            app.animationInProgress = true;
            app.DOM.dashboardContent.style.opacity = '0';
            
            setTimeout(() => {
                // Actualizar y renderizar subvista
                app.currentSubview = subtab.id;
                
                // Actualizar URL sin recargar la página
                const url = new URL(window.location);
                url.searchParams.set('subview', app.currentSubview);
                window.history.pushState({}, '', url);
                
                renderView(app.currentView);
                
                // Restaurar opacidad con transición
                setTimeout(() => {
                    app.DOM.dashboardContent.style.opacity = '1';
                    app.animationInProgress = false;
                }, 50);
            }, 200);
        });
        
        app.DOM.subtabsContainer.appendChild(button);
    });
}

/**
 * Renderiza la vista según la selección actual
 * @param {string} view - Vista a renderizar
 */
function renderView(view) {
    console.log(`Renderizando vista: ${view}`);
    
    // Limpiar el contenido anterior
    if (app.DOM.dashboardContent) {
        //app.DOM.dashboardContent.innerHTML = '';
    } else {
        console.error('No se encontró el contenedor de contenido');
        return;
    }
    
    // Si hay un error o está cargando, mostrar mensaje
    if (dashboardData.loading) {
        showLoadingIndicator(true);
        return;
    }
    
    if (dashboardData.error) {
        showErrorMessage(dashboardData.error);
        return;
    }
    
    // Preparar datos para visualizaciones
    const visualizationData = prepareVisualizationData();
    if (!visualizationData) {
        showErrorMessage('Error al preparar los datos de visualización');
        return;
    }
    
    // Renderizar la vista adecuada
    switch (view) {
        case 'general':
            renderGeneralView(visualizationData);
            break;
        case 'individual':
            renderIndividualView(app.selectedParticipant);
            break;
        case 'curso':
            renderCursoView(app.selectedModule);
            break;
        case 'analitica':
            renderAnaliticaView(app.currentSubview, visualizationData);
            break;
        default:
            showErrorMessage(`Vista no válida: ${view}`);
    }
    
    // Scroll al inicio
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Renderiza la vista general
 * @param {Object} data - Datos para visualizaciones
 */
function renderGeneralView(data) {
    if (!data) return;
    
    // Crear el contenedor principal
    const content = document.createElement('div');
    content.className = 'animated-fade-in';
    
    // KPIs
    const kpiContainer = createKPIContainer(data);
    content.appendChild(kpiContainer);
    
    // Grid para gráficos
    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-1 md:grid-cols-2 gap-4';
    
    // Perfiles de participantes
    const profilesCard = createCard({
        title: 'Perfiles de Participantes',
        content: `
            <div id="profiles-chart" class="chart-container"></div>
            <div class="mt-4">
                <h3 class="font-medium text-gray-700 mb-2">Características de los perfiles:</h3>
                <div id="profiles-legend" class="grid grid-cols-1 gap-2"></div>
            </div>
        `
    });
    grid.appendChild(profilesCard);
    
    // Habilidades del grupo
    const skillsCard = createCard({
        title: 'Habilidades del Grupo',
        content: `
            <div id="skills-chart" class="chart-container"></div>
            <div id="skills-bars" class="mt-4 grid grid-cols-2 gap-2"></div>
        `
    });
    grid.appendChild(skillsCard);
    
    // Objetivos más comunes
    const objectivesCard = createCard({
        title: 'Objetivos Más Comunes',
        content: `
            <div id="objectives-chart" class="chart-container" style="height: 350px;"></div>
        `
    });
    grid.appendChild(objectivesCard);
    
    // Áreas de interés más comunes
    const areasCard = createCard({
        title: 'Áreas de Interés Más Comunes',
        content: `
            <div id="areas-chart" class="chart-container" style="height: 350px;"></div>
        `
    });
    grid.appendChild(areasCard);
    
    // Secuencia de aprendizaje recomendada
    const sequenceCard = createCard({
        title: 'Secuencia de Aprendizaje Recomendada',
        fullWidth: true,
        content: `<div id="sequence-container"></div>`
    });
    grid.appendChild(sequenceCard);
    
    // Distribución de dificultad
    const difficultyCard = createCard({
        title: 'Distribución de Dificultad de Preguntas',
        content: `
            <div id="difficulty-chart" class="chart-container"></div>
            <div class="mt-4">
                <p class="text-sm text-gray-600">
                    El análisis IRT (Teoría de Respuesta al Ítem) muestra la distribución de preguntas según su nivel de dificultad,
                    desde muy fáciles hasta muy difíciles. Esta distribución ayuda a equilibrar la evaluación.
                </p>
            </div>
        `
    });
    grid.appendChild(difficultyCard);
    
    // Componentes principales
    const componentsCard = createCard({
        title: 'Componentes Principales (Análisis Factorial)',
        content: `
            <div class="mb-4">
                <div class="text-sm text-gray-700 mb-1">Varianza total explicada</div>
                <div id="variance-bar"></div>
                <div class="text-right text-xs text-gray-500 mt-1">
                    ${(dashboardData.analisisFactorial.total_explained_variance * 100).toFixed(2)}%
                </div>
            </div>
            
            <div class="overflow-auto max-h-56">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead>
                        <tr>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Factor</th>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Varianza</th>
                        </tr>
                    </thead>
                    <tbody id="components-table" class="divide-y divide-gray-200">
                    </tbody>
                </table>
            </div>
        `
    });
    grid.appendChild(componentsCard);
    
    content.appendChild(grid);
    
    // Limpiar y añadir contenido
    app.DOM.dashboardContent.innerHTML = '';
    app.DOM.dashboardContent.appendChild(content);
    
    // Esperar a que el DOM se actualice antes de crear gráficos
    setTimeout(() => {
        // Crear visualizaciones
        try {
            createPieChart('profiles-chart', data.clusterDistribution, null);
            createSkillsRadarChart('skills-chart', data.radarData, null);
            createBarChart('objectives-chart', data.objetivosMasComunes, 'Objetivos', true);
            createBarChart('areas-chart', data.areasMasComunes, 'Áreas de Interés', true);
            createPieChart('difficulty-chart', data.dificultadData, null);
            createProgressBar('variance-bar', dashboardData.analisisFactorial.total_explained_variance * 100, 100);
            createSequenceComponent('sequence-container', data.secuenciaData);
            
            // Poblar leyenda de perfiles
            populateProfilesLegend(data);
            
            // Poblar barras de habilidades
            populateSkillsBars();
            
            // Poblar tabla de componentes
            populateComponentsTable(data.factorialComponentsData);
        } catch (error) {
            console.error('Error al crear visualizaciones:', error);
            showErrorMessage('Error al crear visualizaciones. Por favor, recarga la página.');
        }
    }, 100);
}

/**
 * Crea un contenedor de KPIs para la vista general
 * @param {Object} data - Datos para los KPIs
 * @returns {HTMLElement} - Elemento contenedor de KPIs
 */
function createKPIContainer(data) {
    const kpiContainer = document.createElement('div');
    kpiContainer.className = 'kpi-container';
    
    const kpis = [
        { 
            title: 'Participantes', 
            value: data.resumenData.participants, 
            subtitle: `En ${data.resumenData.clusters} perfiles identificados`,
            icon: 'users'
        },
        { 
            title: 'Módulos', 
            value: data.resumenData.modules, 
            subtitle: `Con ${data.resumenData.total_sessions} sesiones en total`,
            icon: 'book'
        },
        { 
            title: 'Habilidades Evaluadas', 
            value: data.radarData.length, 
            subtitle: `Agrupadas en ${data.resumenData.components} factores`,
            icon: 'cogs'
        },
        { 
            title: 'Objetivos del Curso', 
            value: dashboardData.planCurso.objetivos_aprendizaje.length, 
            subtitle: `En ${data.resumenData.learning_phases} fases de aprendizaje`,
            icon: 'bullseye'
        }
    ];
    
    kpis.forEach(kpi => {
        const kpiCard = document.createElement('div');
        kpiCard.className = 'kpi-card';
        
        kpiCard.innerHTML = `
            <div class="kpi-title">${kpi.title}</div>
            <div class="kpi-value">${kpi.value}</div>
            <div class="kpi-subtitle">${kpi.subtitle}</div>
        `;
        
        kpiContainer.appendChild(kpiCard);
    });
    
    return kpiContainer;
}

/**
 * Crea una tarjeta con título y contenido
 * @param {Object} options - Opciones de la tarjeta
 * @param {string} options.title - Título de la tarjeta
 * @param {string} options.content - Contenido HTML de la tarjeta
 * @param {boolean} [options.fullWidth=false] - Si la tarjeta debe ocupar todo el ancho
 * @returns {HTMLElement} - Elemento de tarjeta creado
 */
function createCard({ title, content, fullWidth = false }) {
    const card = document.createElement('div');
    card.className = 'card';
    
    if (fullWidth) {
        card.style.gridColumn = '1 / -1';
    }
    
    card.innerHTML = `
        <h2 class="card-title">${title}</h2>
        ${content}
    `;
    
    return card;
}

/**
 * Puebla la leyenda de perfiles
 * @param {Object} data - Datos de visualización
 */
function populateProfilesLegend(data) {
    const profilesLegend = document.getElementById('profiles-legend');
    if (!profilesLegend) return;
    
    Object.entries(dashboardData.clustering.cluster_profiles).forEach(([id, profile], index) => {
        const profileItem = document.createElement('div');
        profileItem.className = 'flex items-center';
        profileItem.innerHTML = `
            <div class="w-3 h-3 rounded-full mr-2" style="background-color: ${COLORS[index % COLORS.length]}"></div>
            <div class="text-sm">
                <span class="font-medium">${profile.nombre_perfil}</span>: ${profile.habilidades_distintivas[0]?.skill || ""}
            </div>
        `;
        profilesLegend.appendChild(profileItem);
    });
}

/**
 * Puebla las barras de habilidades
 */
function populateSkillsBars() {
    const skillsBars = document.getElementById('skills-bars');
    if (!skillsBars) return;
    
    Object.entries(dashboardData.habilidadesGrupo).forEach(([skill, info]) => {
        const skillBar = document.createElement('div');
        skillBar.className = 'skill-meter';
        skillBar.innerHTML = `
            <div class="skill-meter-header">
                <div class="skill-name">${skill}</div>
                <div class="skill-value">${info.porcentaje_promedio.toFixed(1)}%</div>
            </div>
            <div class="skill-meter-bar">
                <div class="skill-meter-value" 
                     style="width: ${info.porcentaje_promedio}%; 
                            background-color: ${getColorByPercentage(info.porcentaje_promedio)}">
                </div>
            </div>
        `;
        skillsBars.appendChild(skillBar);
    });
}

/**
 * Obtiene un color basado en un porcentaje
 * @param {number} percentage - Porcentaje (0-100)
 * @returns {string} - Color en formato hexadecimal
 */
function getColorByPercentage(percentage) {
    if (percentage >= 80) return '#10b981'; // Verde para alto
    if (percentage >= 60) return '#3b82f6'; // Azul para medio-alto
    if (percentage >= 40) return '#f59e0b'; // Amarillo para medio
    return '#ef4444'; // Rojo para bajo
}

/**
 * Puebla la tabla de componentes
 * @param {Array} componentsData - Datos de componentes factoriales
 */
function populateComponentsTable(componentsData) {
    const componentsTable = document.getElementById('components-table');
    if (!componentsTable) return;
    
    componentsData.forEach(component => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">${component.factor}</td>
            <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-500">${component.description}</td>
            <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-500">${component.variance.toFixed(2)}%</td>
        `;
        componentsTable.appendChild(row);
    });
}

/**
 * Renderiza la vista individual de un participante
 * @param {string} participantId - ID del participante
 */
function renderIndividualView(participantId) {
    // Make sure perfilesAnaliticos is defined and has perfiles property
    if (!window.perfilesAnaliticos || !window.perfilesAnaliticos.perfiles) {
        console.warn('Datos de perfiles analíticos no disponibles. Cargando...');
        // Show loading message and attempt to load perfiles
        app.DOM.dashboardContent.innerHTML = `
            <div class="card text-center animated-fade-in">
                <div class="loading-container">
                    <div class="loading-spinner"></div>
                    <p>Cargando datos de perfiles analíticos...</p>
                </div>
            </div>
        `;
        
        // Try to load the profiles and then re-render
        loadPerfilesAnaliticos()
            .then(() => renderIndividualView(participantId))
            .catch(error => {
                console.error('Error cargando perfiles:', error);
                showErrorMessage('No se pudieron cargar los perfiles analíticos. Por favor, recarga la página.');
            });
        return;
    }

    if (!participantId) {
        // Mostrar mensaje de seleccionar participante
        app.DOM.dashboardContent.innerHTML = `
            <div class="card text-center animated-fade-in">
                <p class="text-gray-600">Selecciona un participante para ver su información detallada.</p>
                
                <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
                    ${Object.keys(perfilesAnaliticos.perfiles || {}).slice(0, 8).map(id => `
                        <div class="participant-card" 
                             onclick="document.getElementById('select-participant').value = '${id}'; 
                                     document.getElementById('select-participant').dispatchEvent(new Event('change'));">
                            Participante ${id}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        return;
    }
    
    // Obtener datos del perfil del nuevo JSON
    const perfil = perfilesAnaliticos.perfiles[participantId];
    if (!perfil) {
        showErrorMessage(`No se encontraron datos para el participante ${participantId}`);
        return;
    }
    
    const content = document.createElement('div');
    content.className = 'animated-fade-in';
    
    // Header del perfil con información general
    const headerCard = createPerfilHeader(perfil);
    content.appendChild(headerCard);
    
    // Grid principal para el contenido
    const mainGrid = document.createElement('div');
    mainGrid.className = 'grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6';
    
    // Columna izquierda (diagnóstico general y demográficos)
    const leftColumn = document.createElement('div');
    leftColumn.className = 'col-span-1';
    
    // Columna central (análisis por sección)
    const middleColumn = document.createElement('div');
    middleColumn.className = 'col-span-1 lg:col-span-2';
    
    // Tarjeta de diagnóstico general
    leftColumn.appendChild(createDiagnosticoCard(perfil));
    
    // Tarjeta demográfica
    leftColumn.appendChild(createDemograficosCard(perfil));
    
    // Tarjeta de objetivos y experiencia
    leftColumn.appendChild(createObjetivosCard(perfil));
    
    // Análisis por sección
    middleColumn.appendChild(createAnalisisSecciones(perfil));
    
    // Fortalezas y debilidades
    middleColumn.appendChild(createFortalezasDebilidadesCard(perfil));
    
    // Añadir columnas al grid principal
    mainGrid.appendChild(leftColumn);
    mainGrid.appendChild(middleColumn);
    content.appendChild(mainGrid);
    
    // Sección de recomendaciones (ancho completo)
    const recomendacionesSection = createRecomendacionesSection(perfil);
    content.appendChild(recomendacionesSection);
    
    // Limpiar y añadir contenido
    app.DOM.dashboardContent.innerHTML = '';
    app.DOM.dashboardContent.appendChild(content);
    
    // Inicializar gráficos y visualizaciones después de que el DOM se actualice
    setTimeout(() => {
        try {
            renderCharts(perfil);
        } catch (error) {
            console.error('Error al crear visualizaciones para el participante:', error);
            showErrorMessage('Error al crear visualizaciones de participante. Por favor, recarga la página.');
        }
    }, 100);
}

/**
 * Crea el encabezado del perfil con información general
 * @param {Object} perfil - Datos del perfil
 * @returns {HTMLElement} - Elemento de encabezado
 */
function createPerfilHeader(perfil) {
    const headerCard = document.createElement('div');
    headerCard.className = 'profile-header-card';
    
    // Determinar niveles y clases de color
    const nivelGeneral = perfil.datos_diagnostico.nivel_general;
    const nivelClass = getNivelClass(nivelGeneral);
    const percentil = perfil.datos_diagnostico.percentil;
    
    headerCard.innerHTML = `
        <div class="flex flex-col md:flex-row items-start md:items-center justify-between p-6 bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg text-white shadow-lg">
            <div class="flex items-center mb-4 md:mb-0">
                <div class="profile-avatar bg-white text-blue-600 rounded-full flex items-center justify-center h-16 w-16 mr-4">
                    <i class="fas fa-user-circle text-4xl"></i>
                </div>
                <div>
                    <h2 class="text-2xl font-bold">Participante ${perfil.id}</h2>
                    <div class="flex items-center mt-1">
                        <span class="bg-white bg-opacity-20 px-3 py-1 rounded-full text-sm font-medium">
                            ${perfil.datos_demograficos.rol} | ${perfil.datos_demograficos.sector}
                        </span>
                    </div>
                </div>
            </div>
            
            <div class="flex flex-col items-end">
                <div class="text-right">
                    <div class="text-xs uppercase tracking-wide mb-1">Nivel General</div>
                    <div class="flex items-center">
                        <span class="text-2xl font-bold ${nivelClass}">${nivelGeneral.toUpperCase()}</span>
                        <span class="ml-2 px-2 py-1 bg-white bg-opacity-20 rounded-md text-xs">
                            Percentil ${percentil.toFixed(0)}
                        </span>
                    </div>
                </div>
                <div class="mt-2 text-sm">
                    <span class="font-medium">${perfil.datos_diagnostico.porcentaje_general.toFixed(1)}%</span> 
                    <span class="text-xs opacity-75">(${perfil.datos_diagnostico.puntaje_total}/${perfil.datos_diagnostico.puntaje_maximo_posible} puntos)</span>
                </div>
            </div>
        </div>
    `;
    
    return headerCard;
}

/**
 * Crea la tarjeta de diagnóstico general
 * @param {Object} perfil - Datos del perfil
 * @returns {HTMLElement} - Elemento de tarjeta
 */
function createDiagnosticoCard(perfil) {
    const diagnosticoCard = document.createElement('div');
    diagnosticoCard.className = 'card mb-6';
    
    const diagnostico = perfil.datos_diagnostico;
    const comparativa = diagnostico.comparativa_grupo;
    const diferenciaMedia = comparativa.diferencia_media;
    const diferenciaClass = diferenciaMedia >= 0 ? 'text-green-600' : 'text-red-600';
    const diferenciaIcon = diferenciaMedia >= 0 ? 'fa-arrow-up' : 'fa-arrow-down';
    
    diagnosticoCard.innerHTML = `
        <h3 class="card-title flex items-center">
            <i class="fas fa-chart-line mr-2"></i>
            Diagnóstico General
        </h3>
        
        <div class="mt-4">
            <div class="relative pt-1">
                <div class="flex mb-2 items-center justify-between">
                    <div>
                        <span class="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blue-600 bg-blue-200">
                            Rendimiento
                        </span>
                    </div>
                    <div class="text-right">
                        <span class="text-xs font-semibold inline-block text-blue-600">
                            ${diagnostico.porcentaje_general.toFixed(1)}%
                        </span>
                    </div>
                </div>
                <div class="flex h-2 mb-4 overflow-hidden text-xs bg-blue-200 rounded">
                    <div style="width: ${diagnostico.porcentaje_general}%" class="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-600"></div>
                </div>
            </div>
            
            <div class="bg-gray-50 p-4 rounded-lg">
                <h4 class="font-medium text-gray-700 mb-2">Comparativa con el grupo</h4>
                
                <div class="flex items-center justify-between mb-2">
                    <span class="text-sm text-gray-600">Media grupal:</span>
                    <span class="font-semibold">${comparativa.estadisticas_globales.media.toFixed(1)}%</span>
                </div>
                
                <div class="flex items-center justify-between mb-2">
                    <span class="text-sm text-gray-600">Diferencia vs. media:</span>
                    <span class="font-semibold ${diferenciaClass}">
                        <i class="fas ${diferenciaIcon} mr-1"></i>
                        ${Math.abs(diferenciaMedia).toFixed(1)}%
                    </span>
                </div>
                
                <div class="flex items-center justify-between">
                    <span class="text-sm text-gray-600">Interpretación:</span>
                    <span class="text-sm italic">${comparativa.interpretacion}</span>
                </div>
            </div>
            
            <div class="mt-4">
                <div class="flex items-center justify-center gap-4">
                    <div class="flex flex-col items-center">
                        <div class="text-xs text-gray-500">Mínimo</div>
                        <div class="font-semibold">${comparativa.estadisticas_globales.min.toFixed(1)}%</div>
                    </div>
                    <div class="flex flex-col items-center">
                        <div class="text-xs text-gray-500">Q1</div>
                        <div class="font-semibold">${comparativa.estadisticas_globales.q1.toFixed(1)}%</div>
                    </div>
                    <div class="flex flex-col items-center">
                        <div class="text-xs text-gray-500">Mediana</div>
                        <div class="font-semibold">${comparativa.estadisticas_globales.mediana.toFixed(1)}%</div>
                    </div>
                    <div class="flex flex-col items-center">
                        <div class="text-xs text-gray-500">Q3</div>
                        <div class="font-semibold">${comparativa.estadisticas_globales.q3.toFixed(1)}%</div>
                    </div>
                    <div class="flex flex-col items-center">
                        <div class="text-xs text-gray-500">Máximo</div>
                        <div class="font-semibold">${comparativa.estadisticas_globales.max.toFixed(1)}%</div>
                    </div>
                </div>
                
                <div class="mt-4 relative h-4 bg-gray-200 rounded-full">
                    <!-- Rango intercuartil -->
                    <div class="absolute h-4 bg-blue-100 rounded-none"
                         style="left: ${comparativa.estadisticas_globales.q1}%; width: ${comparativa.estadisticas_globales.q3 - comparativa.estadisticas_globales.q1}%;"></div>
                    
                    <!-- Mediana -->
                    <div class="absolute h-4 w-1 bg-blue-800 z-10"
                         style="left: ${comparativa.estadisticas_globales.mediana}%;"></div>
                    
                    <!-- Posición del participante -->
                    <div class="absolute h-6 w-3 -top-1 bg-red-500 rounded-sm"
                         style="left: calc(${diagnostico.porcentaje_general}% - 2px);"></div>
                </div>
            </div>
        </div>
    `;
    
    return diagnosticoCard;
}

/**
 * Crea la tarjeta de datos demográficos
 * @param {Object} perfil - Datos del perfil
 * @returns {HTMLElement} - Elemento de tarjeta
 */
function createDemograficosCard(perfil) {
    const demograficosCard = document.createElement('div');
    demograficosCard.className = 'card mb-6';
    
    const demograficos = perfil.datos_demograficos;
    const comparativa = perfil.comparativa_demografica;
    
    demograficosCard.innerHTML = `
        <h3 class="card-title flex items-center">
            <i class="fas fa-users mr-2"></i>
            Datos Demográficos
        </h3>
        
        <div class="mt-4 space-y-4">
            ${createDemograficoItem('Sexo', demograficos.sexo, comparativa.sexo)}
            ${createDemograficoItem('Rol', demograficos.rol, comparativa.rol)}
            ${createDemograficoItem('Sector', demograficos.sector, comparativa.sector)}
            ${createDemograficoItem('Formación', demograficos.formacion, comparativa.formacion)}
            
            <div class="mt-4 pt-4 border-t border-gray-200">
                <h4 class="font-medium text-gray-700 mb-2">Experiencia con Power BI</h4>
                <div class="bg-blue-50 p-3 rounded-md text-blue-800">
                    <i class="fas fa-info-circle mr-1"></i>
                    ${perfil.objetivos_experiencia.experiencia_powerbi}
                </div>
            </div>
        </div>
    `;
    
    return demograficosCard;
}

/**
 * Crea un elemento de información demográfica
 * @param {string} label - Etiqueta
 * @param {string} value - Valor
 * @param {Object} comparativa - Datos de comparativa
 * @returns {string} - HTML del elemento
 */
function createDemograficoItem(label, value, comparativa) {
    if (!comparativa) return '';
    
    const { diferencia_media, percentil_en_grupo } = comparativa.comparativa;
    const diferenciaClass = diferencia_media >= 0 ? 'text-green-600' : 'text-red-600';
    const diferenciaIcon = diferencia_media >= 0 ? 'fa-arrow-up' : 'fa-arrow-down';
    
    return `
        <div>
            <div class="flex justify-between items-center mb-1">
                <span class="text-sm text-gray-600">${label}:</span>
                <span class="font-medium">${value}</span>
            </div>
            <div class="flex items-center justify-between text-xs">
                <span>vs. grupo <span class="font-medium">(${comparativa.estadisticas_grupo.participantes} participantes)</span>:</span>
                <span class="font-semibold ${diferenciaClass}">
                    <i class="fas ${diferenciaIcon} mr-1"></i>
                    ${Math.abs(diferencia_media).toFixed(1)}%
                </span>
            </div>
            <div class="mt-1 text-xs text-gray-500 text-right">
                Percentil ${percentil_en_grupo.toFixed(1)} en el grupo
            </div>
        </div>
    `;
}

/**
 * Crea la tarjeta de objetivos y experiencia
 * @param {Object} perfil - Datos del perfil
 * @returns {HTMLElement} - Elemento de tarjeta
 */
function createObjetivosCard(perfil) {
    const objetivosCard = document.createElement('div');
    objetivosCard.className = 'card mb-6';
    
    const objetivosExp = perfil.objetivos_experiencia;
    
    // Filtrar entradas inválidas (como "0.0")
    const objetivos = objetivosExp.objetivos.filter(o => o !== "0.0");
    const areas = objetivosExp.areas_interes.filter(a => a !== "0.0");
    const experiencia = objetivosExp.experiencia_previa.filter(e => e !== "0.0");
    
    objetivosCard.innerHTML = `
        <h3 class="card-title flex items-center">
            <i class="fas fa-bullseye mr-2"></i>
            Objetivos y Experiencia
        </h3>
        
        <div class="mt-4 space-y-4">
            <div>
                <h4 class="font-medium text-gray-700 mb-2">Objetivos</h4>
                <ul class="list-disc pl-5 space-y-1">
                    ${objetivos.length > 0 
                        ? objetivos.map(o => `<li class="text-sm">${o}</li>`).join('') 
                        : '<li class="text-sm text-gray-500 italic">No se han especificado objetivos</li>'}
                </ul>
            </div>
            
            <div>
                <h4 class="font-medium text-gray-700 mb-2">Áreas de Interés</h4>
                <div class="flex flex-wrap gap-2">
                    ${areas.length > 0 
                        ? areas.map(a => `<span class="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">${a}</span>`).join('') 
                        : '<span class="text-sm text-gray-500 italic">No se han especificado áreas de interés</span>'}
                </div>
            </div>
            
            <div>
                <h4 class="font-medium text-gray-700 mb-2">Experiencia Previa</h4>
                <ul class="list-disc pl-5 space-y-1">
                    ${experiencia.length > 0 
                        ? experiencia.map(e => `<li class="text-sm">${e}</li>`).join('') 
                        : '<li class="text-sm text-gray-500 italic">No se ha especificado experiencia previa</li>'}
                </ul>
            </div>
        </div>
    `;
    
    return objetivosCard;
}

/**
 * Crea la tarjeta de análisis por secciones
 * @param {Object} perfil - Datos del perfil
 * @returns {HTMLElement} - Elemento de tarjeta
 */
function createAnalisisSecciones(perfil) {
    const analisisCard = document.createElement('div');
    analisisCard.className = 'card mb-6';
    
    const analisis = perfil.analisis_por_seccion;
    const secciones = Object.keys(analisis);
    
    // Preparar datos para el gráfico radar
    const radarDataIds = {
        chartId: `radar-chart-${Date.now()}`,
        tableId: `seccion-table-${Date.now()}`
    };
    
    analisisCard.innerHTML = `
        <h3 class="card-title flex items-center">
            <i class="fas fa-puzzle-piece mr-2"></i>
            Análisis por Sección
        </h3>
        
        <div class="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
                <div id="${radarDataIds.chartId}" class="chart-container" style="height: 300px;"></div>
            </div>
            
            <div>
                <div class="overflow-auto max-h-80 pr-2">
                    <table class="min-w-full table-auto">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sección</th>
                                <th class="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Nivel</th>
                                <th class="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Resultado</th>
                                <th class="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">vs. Media</th>
                            </tr>
                        </thead>
                        <tbody id="${radarDataIds.tableId}" class="divide-y divide-gray-200 bg-white">
                            ${secciones.map(seccion => {
                                const datos = analisis[seccion];
                                const nivelClass = getNivelClass(datos.nivel);
                                const comparativa = datos.comparativa.diferencia_media;
                                const comparativaClass = comparativa >= 0 ? 'text-green-600' : 'text-red-600';
                                const comparativaIcon = comparativa >= 0 ? 'fa-arrow-up' : 'fa-arrow-down';
                                
                                return `
                                    <tr class="hover:bg-gray-50 transition-colors duration-200">
                                        <td class="px-3 py-2 whitespace-nowrap">
                                            <div class="flex items-center">
                                                <div class="w-2 h-2 rounded-full mr-2" 
                                                     style="background-color: ${getColorByImportancia(datos.importancia)}"></div>
                                                <div class="text-sm font-medium text-gray-900" title="${datos.titulo}">
                                                    ${formatName(datos.titulo, 25)}
                                                </div>
                                            </div>
                                            <div class="text-xs text-gray-500">
                                                Importancia: <span class="font-medium">${datos.importancia}</span>
                                            </div>
                                        </td>
                                        <td class="px-3 py-2 whitespace-nowrap text-center">
                                            <span class="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${nivelClass} bg-opacity-10">
                                                ${datos.nivel}
                                            </span>
                                        </td>
                                        <td class="px-3 py-2 whitespace-nowrap text-center">
                                            <div class="text-sm">${datos.porcentaje.toFixed(1)}%</div>
                                            <div class="text-xs text-gray-500">Percentil ${datos.percentil.toFixed(0)}</div>
                                        </td>
                                        <td class="px-3 py-2 whitespace-nowrap text-center">
                                            <div class="text-sm font-medium ${comparativaClass}">
                                                <i class="fas ${comparativaIcon} mr-1"></i>
                                                ${Math.abs(comparativa).toFixed(1)}%
                                            </div>
                                            <div class="text-xs text-gray-500">
                                                ${datos.comparativa.interpretacion.split('.')[0]}
                                            </div>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        
        <div class="mt-6">
            <h4 class="font-medium text-gray-700 mb-2">Detalles por Sección</h4>
            <div class="space-y-4" id="seccion-details">
                ${secciones.map(seccion => {
                    const datos = analisis[seccion];
                    const nivelClass = getNivelClass(datos.nivel);
                    const comparativa = datos.comparativa;
                    const interpretacionClass = getInterpretacionClass(comparativa.interpretacion);
                    
                    return `
                        <div class="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                            <div class="flex flex-col md:flex-row md:items-center justify-between mb-3">
                                <div>
                                    <h5 class="font-medium text-gray-900">${datos.titulo}</h5>
                                    <div class="text-sm text-gray-500">${datos.descripcion}</div>
                                </div>
                                <div class="mt-2 md:mt-0 flex items-center space-x-2">
                                    <span class="px-3 py-1 ${nivelClass} bg-opacity-10 text-sm font-medium rounded-full">
                                        ${datos.nivel}
                                    </span>
                                    <span class="flex items-center text-sm font-medium ${comparativa.diferencia_media >= 0 ? 'text-green-600' : 'text-red-600'}">
                                        <i class="fas ${comparativa.diferencia_media >= 0 ? 'fa-arrow-up' : 'fa-arrow-down'} mr-1"></i>
                                        ${Math.abs(comparativa.diferencia_media).toFixed(1)}%
                                    </span>
                                </div>
                            </div>
                            <div class="flex flex-wrap gap-4 text-sm">
                                <div>
                                    <span class="text-gray-500">Puntaje:</span>
                                    <span class="font-medium">${datos.puntaje}/${datos.puntaje_maximo}</span>
                                </div>
                                <div>
                                    <span class="text-gray-500">Porcentaje:</span>
                                    <span class="font-medium">${datos.porcentaje.toFixed(1)}%</span>
                                </div>
                                <div>
                                    <span class="text-gray-500">Percentil:</span>
                                    <span class="font-medium">${datos.percentil.toFixed(1)}</span>
                                </div>
                                <div>
                                    <span class="text-gray-500">Importancia:</span>
                                    <span class="font-medium">${datos.importancia}</span>
                                </div>
                            </div>
                            <div class="mt-3 pt-3 border-t border-gray-200">
                                <div class="flex items-start gap-2">
                                    <div class="text-${interpretacionClass}-600">
                                        <i class="fas fa-info-circle mt-0.5"></i>
                                    </div>
                                    <div class="text-sm text-gray-700">
                                        ${comparativa.interpretacion}
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
    
    // Guardar IDs para crear gráficos después
    analisisCard.dataset.radarChartId = radarDataIds.chartId;
    analisisCard.dataset.tableId = radarDataIds.tableId;
    
    return analisisCard;
}

/**
 * Crea la tarjeta de fortalezas y debilidades
 * @param {Object} perfil - Datos del perfil
 * @returns {HTMLElement} - Elemento de tarjeta
 */
function createFortalezasDebilidadesCard(perfil) {
    const fortalezasDebilidadesCard = document.createElement('div');
    fortalezasDebilidadesCard.className = 'card mb-6';
    
    const fortalezasDebilidades = perfil.fortalezas_debilidades;
    const fortalezas = fortalezasDebilidades.fortalezas || [];
    const debilidades = fortalezasDebilidades.areas_mejora || [];
    
    fortalezasDebilidadesCard.innerHTML = `
        <h3 class="card-title flex items-center">
            <i class="fas fa-balance-scale mr-2"></i>
            Fortalezas y Áreas de Mejora
        </h3>
        
        <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <h4 class="font-medium text-gray-700 mb-3 flex items-center">
                    <i class="fas fa-star text-yellow-500 mr-2"></i>
                    Fortalezas Identificadas
                </h4>
                
                ${fortalezas.length > 0 ? `
                    <div class="space-y-3">
                        ${fortalezas.map(f => `
                            <div class="bg-green-50 border-l-4 border-green-500 p-3 rounded-r-md">
                                <div class="font-medium text-green-800">${f.seccion}</div>
                                <div class="flex justify-between items-center text-sm mt-1">
                                    <span>Nivel: <span class="font-medium">${f.nivel}</span></span>
                                    <span class="text-green-600 font-medium">${f.diferencia_media}</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                ` : `
                    <div class="bg-gray-50 p-4 rounded-md text-gray-500 italic text-sm">
                        No se han identificado fortalezas específicas.
                    </div>
                `}
            </div>
            
            <div>
                <h4 class="font-medium text-gray-700 mb-3 flex items-center">
                    <i class="fas fa-tools text-red-500 mr-2"></i>
                    Áreas de Mejora
                </h4>
                
                ${debilidades.length > 0 ? `
                    <div class="space-y-3">
                        ${debilidades.map(d => `
                            <div class="bg-red-50 border-l-4 border-red-500 p-3 rounded-r-md">
                                <div class="font-medium text-red-800">${d.seccion}</div>
                                <div class="flex justify-between items-center text-sm mt-1">
                                    <span>Nivel: <span class="font-medium">${d.nivel}</span></span>
                                    <span class="text-red-600 font-medium">${d.diferencia_media}</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                ` : `
                    <div class="bg-gray-50 p-4 rounded-md text-gray-500 italic text-sm">
                        No se han identificado áreas específicas de mejora.
                    </div>
                `}
            </div>
        </div>
    `;
    
    return fortalezasDebilidadesCard;
}

/**
 * Crea la sección de recomendaciones
 * @param {Object} perfil - Datos del perfil
 * @returns {HTMLElement} - Elemento de sección
 */
function createRecomendacionesSection(perfil) {
    const recomendacionesSection = document.createElement('div');
    recomendacionesSection.className = 'mt-8';
    
    const recomendaciones = perfil.recomendaciones;
    const prioridades = recomendaciones.prioridades_aprendizaje || [];
    const recomendacionesPerfil = recomendaciones.recomendaciones_por_perfil || [];
    const rutaSugerida = recomendaciones.ruta_sugerida || [];
    
    recomendacionesSection.innerHTML = `
        <h2 class="text-xl font-bold text-gray-800 mb-4 flex items-center">
            <i class="fas fa-graduation-cap mr-2 text-blue-600"></i>
            Plan de Aprendizaje Personalizado
        </h2>
        
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Prioridades de aprendizaje -->
            <div class="card">
                <h3 class="card-title flex items-center">
                    <i class="fas fa-bullseye mr-2"></i>
                    Prioridades de Aprendizaje
                </h3>
                
                ${prioridades.length > 0 ? `
                    <div class="mt-4 space-y-4">
                        ${prioridades.map((p, index) => `
                            <div class="bg-blue-50 p-4 rounded-md">
                                <div class="flex items-start">
                                    <div class="flex-shrink-0 bg-blue-600 text-white rounded-full h-6 w-6 flex items-center justify-center text-sm font-medium">
                                        ${index + 1}
                                    </div>
                                    <div class="ml-3">
                                        <h4 class="text-sm font-medium text-blue-800">${p.area}</h4>
                                        <p class="mt-1 text-xs text-blue-700">${p.descripcion}</p>
                                    </div>
                                </div>
                                <div class="mt-2 pt-2 border-t border-blue-100">
                                    <div class="flex justify-between text-xs">
                                        <span class="font-medium text-blue-700">Razón:</span>
                                        <span class="text-blue-800">${p.razon}</span>
                                    </div>
                                    <div class="mt-1 text-xs text-blue-700">
                                        <span class="font-medium">Impacto:</span>
                                        <span>${p.impacto}</span>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                ` : `
                    <div class="mt-4 bg-gray-50 p-4 rounded-md text-gray-500 italic text-sm">
                        No se han identificado prioridades específicas de aprendizaje.
                    </div>
                `}
            </div>
            
            <!-- Recomendaciones por perfil -->
            <div class="card">
                <h3 class="card-title flex items-center">
                    <i class="fas fa-user-tag mr-2"></i>
                    Recomendaciones por Perfil
                </h3>
                
                ${recomendacionesPerfil.length > 0 ? `
                    <div class="mt-4 space-y-4">
                        ${recomendacionesPerfil.map(r => `
                            <div class="bg-purple-50 p-4 rounded-md">
                                <div class="flex items-start">
                                    <div class="flex-shrink-0">
                                        <span class="inline-flex items-center justify-center h-8 w-8 rounded-md bg-purple-500 text-white">
                                            <i class="fas fa-user-circle"></i>
                                        </span>
                                    </div>
                                    <div class="ml-3">
                                        <h4 class="text-sm font-medium text-purple-800">Perfil: ${r.perfil}</h4>
                                        <p class="mt-1 text-sm text-purple-700">${r.recomendacion}</p>
                                    </div>
                                </div>
                                <div class="mt-2 text-xs text-purple-700">
                                    <div class="flex items-start">
                                        <span class="font-medium mr-1">Justificación:</span>
                                        <span>${r.justificacion}</span>
                                    </div>
                                    <div class="mt-1 flex justify-between">
                                        <span class="font-medium">Prioridad:</span>
                                        <span class="bg-purple-200 px-2 py-0.5 rounded text-purple-800 font-medium">
                                            ${r.prioridad}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                ` : `
                    <div class="mt-4 bg-gray-50 p-4 rounded-md text-gray-500 italic text-sm">
                        No se han identificado recomendaciones específicas por perfil.
                    </div>
                `}
            </div>
            
            <!-- Ruta sugerida -->
            <div class="card">
                <h3 class="card-title flex items-center">
                    <i class="fas fa-route mr-2"></i>
                    Ruta de Aprendizaje Sugerida
                </h3>
                
                ${rutaSugerida.length > 0 ? `
                    <div class="mt-4">
                        <div class="relative">
                            <!-- Línea de progreso vertical -->
                            <div class="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                            
                            <div class="space-y-6">
                                ${rutaSugerida.map((fase, index) => {
                                    const prioridadClass = getPrioridadClass(fase.prioridad);
                                    
                                    return `
                                        <div class="relative pl-10">
                                            <!-- Círculo de fase -->
                                            <div class="absolute left-0 top-0 flex items-center justify-center w-8 h-8 rounded-full bg-${prioridadClass}-100 border-2 border-${prioridadClass}-500 z-10">
                                                <span class="text-${prioridadClass}-700 font-bold text-sm">${fase.orden}</span>
                                            </div>
                                            
                                            <div class="bg-${prioridadClass}-50 p-3 rounded-md border border-${prioridadClass}-100">
                                                <h4 class="font-medium text-${prioridadClass}-800 text-sm">${fase.fase}</h4>
                                                <div class="mt-2 grid grid-cols-2 gap-2 text-xs">
                                                    <div>
                                                        <span class="text-gray-500">Nivel actual:</span>
                                                        <span class="font-medium">${fase.nivel_actual}</span>
                                                    </div>
                                                    <div>
                                                        <span class="text-gray-500">Objetivo:</span>
                                                        <span class="font-medium">${fase.objetivo}</span>
                                                    </div>
                                                    <div>
                                                        <span class="text-gray-500">Prioridad:</span>
                                                        <span class="font-medium">${fase.prioridad}</span>
                                                    </div>
                                                </div>
                                                
                                                <div class="mt-2 pt-2 border-t border-${prioridadClass}-100">
                                                    <div class="text-xs font-medium text-${prioridadClass}-700 mb-1">Contenidos clave:</div>
                                                    <ul class="list-disc pl-4 text-xs text-${prioridadClass}-700">
                                                        ${fase.contenidos_clave.map(contenido => `
                                                            <li>${contenido}</li>
                                                        `).join('')}
                                                    </ul>
                                                </div>
                                                
                                                <div class="mt-2 text-xs text-${prioridadClass}-700">
                                                    <span class="font-medium">Enfoque:</span>
                                                    <span>${fase.enfoque_recomendado}</span>
                                                </div>
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    </div>
                ` : `
                    <div class="mt-4 bg-gray-50 p-4 rounded-md text-gray-500 italic text-sm">
                        No se ha generado una ruta de aprendizaje sugerida.
                    </div>
                `}
            </div>
        </div>
    `;
    
    return recomendacionesSection;
}

/**
 * Renderiza los gráficos después de que el DOM se ha actualizado
 * @param {Object} perfil - Datos del perfil
 */
function renderCharts(perfil) {
    // Crear gráfico radar para análisis por sección
    const radarChartId = document.querySelector('.card').dataset.radarChartId;
    if (radarChartId) {
        const analisis = perfil.analisis_por_seccion;
        const radarData = Object.keys(analisis).map(seccion => {
            const datos = analisis[seccion];
            return {
                subject: seccion.toUpperCase(),
                'Participante': datos.porcentaje,
                'Media Grupal': datos.estadisticas_grupo.media,
                fullMark: 100
            };
        });
        
        createCustomRadarChart(radarChartId, radarData);
    }
}

/**
 * Crea un gráfico radar personalizado
 * @param {string} containerId - ID del contenedor
 * @param {Array} data - Datos para el gráfico
 */
function createCustomRadarChart(containerId, data) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Limpiar contenedor
    container.innerHTML = '';
    
    const canvas = document.createElement('canvas');
    container.appendChild(canvas);
    
    const ctx = canvas.getContext('2d');
    
    const labels = data.map(item => item.subject);
    const participanteData = data.map(item => item['Participante']);
    const grupalData = data.map(item => item['Media Grupal']);
    
    try {
        new Chart(ctx, {
            type: 'radar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Participante',
                        data: participanteData,
                        fill: true,
                        backgroundColor: 'rgba(54, 162, 235, 0.2)',
                        borderColor: 'rgb(54, 162, 235)',
                        pointBackgroundColor: 'rgb(54, 162, 235)',
                        pointBorderColor: '#fff',
                        pointHoverBackgroundColor: '#fff',
                        pointHoverBorderColor: 'rgb(54, 162, 235)'
                    },
                    {
                        label: 'Media Grupal',
                        data: grupalData,
                        fill: true,
                        backgroundColor: 'rgba(255, 99, 132, 0.2)',
                        borderColor: 'rgb(255, 99, 132)',
                        pointBackgroundColor: 'rgb(255, 99, 132)',
                        pointBorderColor: '#fff',
                        pointHoverBackgroundColor: '#fff',
                        pointHoverBorderColor: 'rgb(255, 99, 132)'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                elements: {
                    line: {
                        borderWidth: 3
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: ${context.raw.toFixed(1)}%`;
                            }
                        }
                    }
                },
                scales: {
                    r: {
                        angleLines: {
                            display: true
                        },
                        suggestedMin: 0,
                        suggestedMax: 100,
                        ticks: {
                            stepSize: 20,
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error(`Error al crear gráfico radar:`, error);
        container.innerHTML = `<div class="error-container">Error al crear el gráfico: ${error.message}</div>`;
    }
}

// Funciones de utilidad

/**
 * Obtiene la clase CSS para un nivel
 * @param {string} nivel - Nivel de habilidad
 * @returns {string} - Clase CSS
 */
function getNivelClass(nivel) {
    switch (nivel.toLowerCase()) {
        case 'básico':
        case 'básico-intermedio':
            return 'text-red-600';
        case 'intermedio':
            return 'text-yellow-600';
        case 'intermedio-alto':
            return 'text-blue-600';
        case 'avanzado':
            return 'text-green-600';
        default:
            return 'text-gray-600';
    }
}

/**
 * Obtiene el color según la importancia
 * @param {string} importancia - Nivel de importancia
 * @returns {string} - Color hexadecimal
 */
function getColorByImportancia(importancia) {
    switch (importancia.toLowerCase()) {
        case 'baja':
            return '#9ca3af'; // gray-400
        case 'media':
            return '#60a5fa'; // blue-400
        case 'alta':
            return '#f59e0b'; // amber-500
        case 'muy alta':
            return '#ef4444'; // red-500
        default:
            return '#6b7280'; // gray-500
    }
}

/**
 * Obtiene la clase CSS para la interpretación
 * @param {string} interpretacion - Texto de interpretación
 * @returns {string} - Clase CSS
 */
function getInterpretacionClass(interpretacion) {
    if (interpretacion.includes('Área crítica') || interpretacion.includes('necesidad de atención')) {
        return 'red';
    } else if (interpretacion.includes('Oportunidad de mejora')) {
        return 'yellow';
    } else if (interpretacion.includes('Buen dominio') || interpretacion.includes('Fortaleza')) {
        return 'green';
    } else {
        return 'blue';
    }
}

/**
 * Obtiene la clase CSS para una prioridad
 * @param {string} prioridad - Nivel de prioridad
 * @returns {string} - Clase CSS
 */
function getPrioridadClass(prioridad) {
    switch (prioridad.toLowerCase()) {
        case 'alta':
            return 'red';
        case 'media':
            return 'yellow';
        case 'baja':
            return 'blue';
        default:
            return 'gray';
    }
}

/**
 * Formatea un nombre si es demasiado largo
 * @param {string} text - Texto a formatear
 * @param {number} maxLength - Longitud máxima
 * @returns {string} - Texto formateado
 */
function formatName(text, maxLength) {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

/**
 * Modifica la función prepareParticipantData para usar el nuevo JSON
 * @param {string} participantId - ID del participante
 * @returns {Object|null} - Datos del participante o null si no existe
 */
function prepareParticipantData(participantId) {
    if (!window.perfilesAnaliticos || !window.perfilesAnaliticos.perfiles || !participantId || 
        !window.perfilesAnaliticos.perfiles[participantId]) {
        return null;
    }
    
    try {
        return window.perfilesAnaliticos.perfiles[participantId];
    } catch (error) {
        console.error(`Error al preparar datos del participante ${participantId}:`, error);
        return null;
    }
}

/**
 * Función para cargar el JSON de perfiles analíticos
 * @returns {Promise<Object>} - Promesa que resuelve al objeto de perfiles
 */
async function loadPerfilesAnaliticos() {
    try {
        console.log('Cargando perfiles analíticos...');
        const response = await fetch('data/perfiles_analiticos_consolidados.json');
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        window.perfilesAnaliticos = await response.json();
        console.log('Perfiles analíticos cargados exitosamente');
        return window.perfilesAnaliticos;
    } catch (error) {
        console.error('Error cargando perfiles analíticos:', error);
        throw error;
    }
}

// Modificar la función loadAllData para cargar también los perfiles analíticos
const originalLoadAllData = loadAllData;
loadAllData = async function() {
    try {
        await originalLoadAllData();
        await loadPerfilesAnaliticos();
        console.log('Todos los datos cargados exitosamente, incluyendo perfiles analíticos');
        return dashboardData;
    } catch (error) {
        console.error('Error cargando todos los datos:', error);
        throw error;
    }
};

/**
 * Renderiza la vista de curso
 * @param {string} moduleId - ID del módulo seleccionado
 */
function renderCursoView(moduleId) {
    // Preparar datos
    const visualizationData = prepareVisualizationData();
    if (!visualizationData) return;
    
    const content = document.createElement('div');
    content.className = 'grid grid-cols-1 gap-6 animated-fade-in';
    
    // Tarjeta de estructura del curso
    const estructuraCard = createCard({
        title: 'Estructura del Curso',
        content: `
            <div class="mb-6">
                <h3 class="font-medium text-lg text-gray-700">${dashboardData.planCurso.titulo}</h3>
                <p class="text-gray-600 mt-1">${dashboardData.planCurso.descripcion}</p>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                        <h4 class="font-medium text-gray-700 mb-2">Objetivos de Aprendizaje</h4>
                        <ul class="list-disc pl-5 text-sm text-gray-600">
                            ${dashboardData.planCurso.objetivos_aprendizaje.slice(0, 5).map(objetivo => `<li>${objetivo}</li>`).join('')}
                        </ul>
                    </div>
                    
                    <div>
                        <h4 class="font-medium text-gray-700 mb-2">Público Objetivo</h4>
                        <ul class="list-disc pl-5 text-sm text-gray-600">
                            ${dashboardData.planCurso.publico_objetivo.slice(0, 4).map(publico => `<li>${publico}</li>`).join('')}
                        </ul>
                    </div>
                </div>
            </div>
            
            <h3 class="font-medium text-lg text-gray-700 mb-3">Visión General de Módulos</h3>
            
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead>
                        <tr>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Módulo</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Título</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duración</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sesiones</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acción</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-200" id="modulos-table">
                    </tbody>
                </table>
            </div>
        `
    });
    content.appendChild(estructuraCard);
    
    // Si hay un módulo seleccionado, mostrar detalle
    if (moduleId) {
        const moduloSeleccionado = dashboardData.planCurso.modulos.find(
            m => m.numero.toString() === moduleId
        );
        
        if (moduloSeleccionado) {
            const detalleCard = createCard({
                title: `Módulo ${moduloSeleccionado.numero}: ${moduloSeleccionado.titulo}`,
                content: `
                    <div class="flex justify-between items-start mb-4">
                        <div class="px-3 py-1 bg-blue-100 text-blue-800 rounded-md text-sm">
                            Duración: ${moduloSeleccionado.duracion}
                        </div>
                    </div>
                    
                    <p class="text-gray-600 mb-6">${moduloSeleccionado.descripcion}</p>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                            <h3 class="font-medium text-gray-700 mb-2">Objetivos del Módulo</h3>
                            <ul class="list-disc pl-5 text-sm text-gray-600">
                                ${moduloSeleccionado.objetivos ? moduloSeleccionado.objetivos.map(objetivo => `<li>${objetivo}</li>`).join('') : '<li>No se han definido objetivos específicos para este módulo</li>'}
                            </ul>
                        </div>
                        
                        ${moduloSeleccionado.evaluacion ? `
                            <div>
                                <h3 class="font-medium text-gray-700 mb-2">Evaluación</h3>
                                
                                <div>
                                    <div class="text-sm text-gray-700 mb-1 font-medium">Evaluación Formativa:</div>
                                    <ul class="list-disc pl-5 text-sm text-gray-600 mb-2">
                                        ${moduloSeleccionado.evaluacion.formativa.slice(0, 3).map(item => `<li>${item}</li>`).join('')}
                                    </ul>
                                    
                                    <div class="text-sm text-gray-700 mb-1 font-medium">Evaluación Sumativa:</div>
                                    <ul class="list-disc pl-5 text-sm text-gray-600">
                                        ${moduloSeleccionado.evaluacion.sumativa.slice(0, 3).map(item => `<li>${item}</li>`).join('')}
                                    </ul>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                    
                    <h3 class="font-medium text-lg text-gray-700 mb-4">Sesiones del Módulo</h3>
                    
                    <div class="space-y-4" id="sesiones-container">
                    </div>
                `
            });
            content.appendChild(detalleCard);
        }
    }
    
    // Limpiar y añadir contenido
    app.DOM.dashboardContent.innerHTML = '';
    app.DOM.dashboardContent.appendChild(content);
    
    // Poblar tabla de módulos
    populateModulosTable(visualizationData.modulosData, moduleId);
    
    // Si hay un módulo seleccionado, poblar sesiones
    if (moduleId) {
        const moduloSeleccionado = dashboardData.planCurso.modulos.find(
            m => m.numero.toString() === moduleId
        );
        
        if (moduloSeleccionado && moduloSeleccionado.sesiones) {
            populateSesionesContainer(moduloSeleccionado.sesiones);
        }
    }
}

/**
 * Puebla la tabla de módulos
 * @param {Array} modulosData - Datos de módulos
 * @param {string} currentModuleId - ID del módulo actual
 */
function populateModulosTable(modulosData, currentModuleId) {
    const modulosTable = document.getElementById('modulos-table');
    if (!modulosTable) return;
    
    modulosData.forEach(modulo => {
        const row = document.createElement('tr');
        row.className = currentModuleId === modulo.id.toString() ? 'bg-blue-50' : 'hover:bg-gray-50';
        
        row.innerHTML = `
            <td class="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">${modulo.id}</td>
            <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-700">${modulo.nombre}</td>
            <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">${modulo.duracion}</td>
            <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">${modulo.sesiones}</td>
            <td class="px-4 py-3 whitespace-nowrap text-sm">
                <button 
                    class="module-select-btn px-3 py-1 rounded-md ${
                        currentModuleId === modulo.id.toString() 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-blue-100 text-blue-800'
                    }"
                    data-module-id="${modulo.id}"
                >
                    ${currentModuleId === modulo.id.toString() ? 'Seleccionado' : 'Ver detalle'}
                </button>
            </td>
        `;
        
        modulosTable.appendChild(row);
    });
    
    // Agregar event listeners para botones de selección de módulo
    document.querySelectorAll('.module-select-btn').forEach(button => {
        button.addEventListener('click', () => {
            app.selectedModule = button.getAttribute('data-module-id');
            
            // Actualizar el selector y la URL
            const moduleSelect = document.getElementById('select-module');
            if (moduleSelect) {
                moduleSelect.value = app.selectedModule;
                
                // Actualizar URL sin recargar la página
                const url = new URL(window.location);
                url.searchParams.set('module', app.selectedModule);
                window.history.pushState({}, '', url);
            }
            
            renderView(app.currentView);
        });
    });
}

/**
 * Puebla el contenedor de sesiones
 * @param {Array} sesiones - Sesiones del módulo
 */
function populateSesionesContainer(sesiones) {
    const sesionesContainer = document.getElementById('sesiones-container');
    if (!sesionesContainer) return;
    
    sesiones.forEach(sesion => {
        const sesionCard = document.createElement('div');
        sesionCard.className = 'border border-gray-200 rounded-md p-4 hover:shadow-md transition-shadow';
        
        sesionCard.innerHTML = `
            <div class="flex justify-between items-start">
                <h4 class="font-medium text-gray-700">Sesión ${sesion.numero}: ${sesion.titulo}</h4>
                <div class="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                    ${sesion.duracion}
                </div>
            </div>
            
            <p class="text-sm text-gray-600 mt-1 mb-3">${sesion.descripcion}</p>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <div class="text-sm text-gray-700 mb-1 font-medium">Temas</div>
                    <ul class="list-disc pl-5 text-xs text-gray-600">
                        ${sesion.temas ? sesion.temas.map(tema => `
                            <li>
                                <span class="font-medium">${tema.subcategoria}:</span> ${tema.conocimiento_clave}
                            </li>
                        `).join('') : '<li>No hay temas registrados para esta sesión</li>'}
                    </ul>
                </div>
                
                <div>
                    <div class="text-sm text-gray-700 mb-1 font-medium">Actividades Recomendadas</div>
                    <ul class="list-disc pl-5 text-xs text-gray-600">
                        ${sesion.actividades_recomendadas ? sesion.actividades_recomendadas.map(actividad => `
                            <li>${actividad}</li>
                        `).join('') : '<li>No hay actividades recomendadas para esta sesión</li>'}
                    </ul>
                </div>
            </div>
            
            ${sesion.recursos && sesion.recursos.length > 0 ? `
                <div class="mt-3">
                    <div class="text-sm text-gray-700 mb-1 font-medium">Recursos</div>
                    <div class="flex flex-wrap gap-2">
                        ${sesion.recursos.map(recurso => `
                            <div class="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs flex items-center">
                                <span class="mr-1">${recurso.tipo}:</span>
                                <span class="text-blue-900">${recurso.descripcion}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        `;
        
        sesionesContainer.appendChild(sesionCard);
    });
}

/**
 * Renderiza la vista de analítica según subvista
 * @param {string} subview - Subvista a renderizar
 * @param {Object} data - Datos para visualizaciones
 */
function renderAnaliticaView(subview, data) {
    if (!data) return;
    
    // Limpiar contenido anterior
    app.DOM.dashboardContent.innerHTML = '';
    
    const content = document.createElement('div');
    content.className = 'grid grid-cols-1 gap-6 animated-fade-in';
    
    // Añadir el contenido al dashboardContent
    app.DOM.dashboardContent.appendChild(content);
    
    // Renderizar la subvista apropiada
    switch (subview) {
        case 'clustering':
            renderClusteringView(content, data);
            break;
        case 'factorial':
            renderFactorialView(content, data);
            break;
        case 'irt':
            renderIrtView(content, data);
            break;
        case 'pedagogicas':
            renderRecomendacionesView(content, data);
            break;
        default:
            content.innerHTML = `<div class="error-container">Subvista desconocida: ${subview}</div>`;
    }
}

/**
 * Renderiza la vista de clustering
 * @param {HTMLElement} container - Contenedor donde renderizar
 * @param {Object} data - Datos para visualizaciones
 */
function renderClusteringView(container, data) {
    // Crear identificadores únicos para los gráficos
    const clusteringScatterId = 'clustering-scatter-' + Date.now();
    const clusterDistributionId = 'cluster-distribution-' + Date.now();
    const profilesComparisonId = 'profiles-comparison-' + Date.now();
    
    // Crear tarjeta de clustering
    const clusteringCard = createCard({
        title: 'Análisis de Clustering',
        content: `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h3 class="font-medium text-gray-700 mb-2">Visualización 2D de Clusters</h3>
                    <div id="${clusteringScatterId}" class="chart-container bg-gray-50 rounded-md p-4" style="height: 350px;"></div>
                    <div class="mt-2 text-xs text-gray-600">
                        <p>Esta visualización muestra cómo se agrupan los participantes en el espacio bidimensional, donde la proximidad indica similitud en sus perfiles.</p>
                    </div>
                </div>
                
                <div>
                    <h3 class="font-medium text-gray-700 mb-2">Comparación de Perfiles</h3>
                    
                    <div id="${profilesComparisonId}" class="space-y-3 max-h-96 overflow-y-auto pr-2">
                    </div>
                </div>
            </div>
            
            <div class="mt-6">
                <h3 class="font-medium text-gray-700 mb-2">Distribución de Participantes por Cluster</h3>
                
                <div id="${clusterDistributionId}" class="chart-container" style="height: 300px;"></div>
            </div>
        `
    });
    
    container.appendChild(clusteringCard);
    
    // Esperar a que el DOM se actualice antes de crear visualizaciones
    setTimeout(() => {
        try {
            // Crear visualizaciones con los nuevos IDs
            createScatterChart(clusteringScatterId, data.clusteringVisualizationData, null);
            createBarChart(clusterDistributionId, data.clusterDistribution, 'Distribución de Participantes');
            
            // Poblar comparación de perfiles
            populateProfilesComparison(profilesComparisonId);
        } catch (error) {
            console.error("Error al renderizar vista de clustering:", error);
            document.getElementById(clusteringScatterId).innerHTML = `
                <div class="error-container">Error al crear visualizaciones de clustering</div>
            `;
        }
    }, 100);
}

/**
 * Puebla la comparación de perfiles
 * @param {string} containerId - ID del contenedor
 */
function populateProfilesComparison(containerId) {
    const profilesComparison = document.getElementById(containerId);
    if (!profilesComparison) return;
    
    Object.entries(dashboardData.clustering.cluster_profiles).forEach(([id, profile]) => {
        const profileCard = document.createElement('div');
        profileCard.className = 'border border-gray-200 rounded-md p-3 hover:shadow-md transition-shadow';
        
        profileCard.innerHTML = `
            <div class="flex items-center">
                <div class="w-4 h-4 rounded-full mr-2" style="background-color: ${COLORS[parseInt(id) % COLORS.length]}"></div>
                <h4 class="font-medium text-gray-800">${profile.nombre_perfil}</h4>
                <div class="ml-auto text-sm text-gray-500">
                    ${profile.participantes.length} participantes
                </div>
            </div>
            
            <div class="mt-2 grid grid-cols-1 gap-2">
                <div>
                    <div class="text-xs font-medium text-gray-600 mb-1">Habilidades distintivas:</div>
                    <ul class="list-disc pl-5 text-xs text-gray-600">
                        ${profile.habilidades_distintivas.map(skill => `
                            <li>
                                ${skill.skill}: ${skill.promedio_cluster.toFixed(1)}%
                                <span class="text-green-600 ml-1">(+${skill.diferencia.toFixed(1)}%)</span>
                            </li>
                        `).join('')}
                    </ul>
                </div>
                
                ${profile.habilidades_debiles && profile.habilidades_debiles.length > 0 ? `
                    <div>
                        <div class="text-xs font-medium text-gray-600 mb-1">Áreas de mejora:</div>
                        <ul class="list-disc pl-5 text-xs text-gray-600">
                            ${profile.habilidades_debiles.map(skill => `
                                <li>
                                    ${skill.skill}: ${skill.promedio_cluster.toFixed(1)}%
                                    <span class="text-red-600 ml-1">(${skill.diferencia.toFixed(1)}%)</span>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                ` : ''}
            </div>
            
            <div class="mt-2 flex">
                <div class="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                    ${dashboardData.clustering.cluster_recommendations[id] ? 
                        dashboardData.clustering.cluster_recommendations[id][0] : 'No hay recomendaciones específicas'}
                </div>
            </div>
        `;
        
        profilesComparison.appendChild(profileCard);
    });
}

/**
 * Renderiza la vista de análisis factorial
 * @param {HTMLElement} container - Contenedor donde renderizar
 * @param {Object} data - Datos para visualizaciones
 */
function renderFactorialView(container, data) {
    // Crear identificadores únicos
    const factorVarianceBarId = 'factor-variance-bar-' + Date.now();
    const factorLoadingsTableId = 'factor-loadings-table-' + Date.now();
    const factorComponentsId = 'factor-components-' + Date.now();
    
    // Crear tarjeta factorial
    const factorialCard = createCard({
        title: 'Análisis Factorial',
        content: `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h3 class="font-medium text-gray-700 mb-2">Componentes Identificados</h3>
                    
                    <div id="${factorComponentsId}" class="space-y-4 max-h-96 overflow-y-auto pr-2">
                    </div>
                    
                    <div class="mt-4 bg-blue-50 p-3 rounded-md">
                        <div class="font-medium text-blue-800 mb-1">Varianza total explicada</div>
                        <div id="${factorVarianceBarId}"></div>
                        <div class="text-right text-xs text-blue-600 mt-1">
                            ${(dashboardData.analisisFactorial.total_explained_variance * 100).toFixed(2)}%
                        </div>
                    </div>
                </div>
                
                <div>
                    <h3 class="font-medium text-gray-700 mb-2">Mapa de Cargas Factoriales</h3>
                    
                    <div class="overflow-auto max-h-96">
                        <table class="min-w-full divide-y divide-gray-200">
                            <thead>
                                <tr>
                                    <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Habilidad</th>
                                    <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Factor Principal</th>
                                    <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Carga</th>
                                </tr>
                            </thead>
                            <tbody id="${factorLoadingsTableId}" class="divide-y divide-gray-200">
                            </tbody>
                        </table>
                    </div>
                    
                    <div class="mt-4 text-sm text-gray-600">
                        <p>El análisis factorial agrupa habilidades relacionadas en componentes principales, revelando la estructura subyacente de las competencias. Una carga más alta (positiva o negativa) indica una relación más fuerte con el factor.</p>
                    </div>
                </div>
            </div>
        `
    });
    
    container.appendChild(factorialCard);
    
    // Esperar a que el DOM se actualice
    setTimeout(() => {
        try {
            // Crear barra de varianza
            const varianceBarElement = document.getElementById(factorVarianceBarId);
            if (varianceBarElement) {
                createProgressBar(factorVarianceBarId, dashboardData.analisisFactorial.total_explained_variance * 100, 100);
            }
            
            // Poblar componentes factoriales
            populateFactorComponents(factorComponentsId, data.factorialComponentsData);
            
            // Poblar tabla de cargas factoriales
            populateFactorLoadingsTable(factorLoadingsTableId);
        } catch (error) {
            console.error("Error al renderizar vista factorial:", error);
            document.getElementById(factorComponentsId).innerHTML = `
                <div class="error-container">Error al crear visualizaciones factoriales</div>
            `;
        }
    }, 100);
}

/**
 * Puebla los componentes factoriales
 * @param {string} containerId - ID del contenedor
 * @param {Array} componentsData - Datos de componentes
 */
function populateFactorComponents(containerId, componentsData) {
    const factorComponents = document.getElementById(containerId);
    if (!factorComponents) return;
    
    componentsData.forEach((component, index) => {
        const componentCard = document.createElement('div');
        componentCard.className = 'bg-gray-50 p-4 rounded-md hover:shadow-md transition-shadow';
        
        componentCard.innerHTML = `
            <div class="flex justify-between items-center mb-2">
                <h4 class="font-medium text-gray-800">${component.factor}: ${component.description}</h4>
                <div class="text-sm font-medium text-blue-600">${component.variance.toFixed(1)}%</div>
            </div>
            
            <div class="w-full bg-gray-200 rounded-full h-2">
                <div class="bg-blue-600 h-2 rounded-full" style="width: ${component.variance}%"></div>
            </div>
            
            <div class="mt-3 text-sm text-gray-600">
                <span class="font-medium">Habilidades agrupadas:</span> ${component.skills}
            </div>
        `;
        
        factorComponents.appendChild(componentCard);
    });
}

/**
 * Puebla la tabla de cargas factoriales
 * @param {string} tableId - ID de la tabla
 */
function populateFactorLoadingsTable(tableId) {
    const factorLoadingsTable = document.getElementById(tableId);
    if (!factorLoadingsTable) return;
    
    Object.entries(dashboardData.analisisFactorial.skill_factors).forEach(([skill, info]) => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td class="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">${skill}</td>
            <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-500">${info.factor_principal}</td>
            <td class="px-4 py-2 whitespace-nowrap text-sm">
                <div class="flex items-center">
                    <div class="w-24 bg-gray-200 rounded-full h-2 mr-2">
                        <div class="bg-blue-600 h-2 rounded-full" style="width: ${Math.abs(info.carga) * 100}%"></div>
                    </div>
                    <div class="text-sm ${info.carga < 0 ? 'text-red-600' : 'text-blue-600'}">
                        ${info.carga.toFixed(2)}
                    </div>
                </div>
            </td>
        `;
        
        factorLoadingsTable.appendChild(row);
    });
}

/**
 * Renderiza la vista de análisis IRT
 * @param {HTMLElement} container - Contenedor donde renderizar
 * @param {Object} data - Datos para visualizaciones
 */
function renderIrtView(container, data) {
    // Crear identificadores únicos
    const itemDifficultyChartId = 'item-difficulty-chart-' + Date.now();
    const categoryDistributionChartId = 'category-distribution-chart-' + Date.now();
    const itemParametersTableId = 'item-parameters-table-' + Date.now();
    const difficultyPatternsChartId = 'difficulty-patterns-chart-' + Date.now();
    
    // Crear tarjeta IRT
    const irtCard = createCard({
        title: 'Análisis IRT (Teoría de Respuesta al Ítem)',
        content: `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h3 class="font-medium text-gray-700 mb-2">Dificultad de Preguntas</h3>
                    
                    <div id="${itemDifficultyChartId}" class="chart-container" style="height: 400px;"></div>
                    
                    <div class="mt-2 flex justify-center">
                        <div class="flex items-center space-x-4 text-xs">
                            <div class="flex items-center">
                                <div class="w-3 h-3 rounded-full bg-green-500 mr-1"></div>
                                <span>Muy fácil</span>
                            </div>
                            <div class="flex items-center">
                                <div class="w-3 h-3 rounded-full bg-green-300 mr-1"></div>
                                <span>Fácil</span>
                            </div>
                            <div class="flex items-center">
                                <div class="w-3 h-3 rounded-full bg-yellow-400 mr-1"></div>
                                <span>Medio</span>
                            </div>
                            <div class="flex items-center">
                                <div class="w-3 h-3 rounded-full bg-orange-400 mr-1"></div>
                                <span>Difícil</span>
                            </div>
                            <div class="flex items-center">
                                <div class="w-3 h-3 rounded-full bg-red-500 mr-1"></div>
                                <span>Muy difícil</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div>
                    <h3 class="font-medium text-gray-700 mb-2">Distribución por Categoría</h3>
                    
                    <div id="${categoryDistributionChartId}" class="chart-container" style="height: 300px;"></div>
                    
                    <div class="mt-4 overflow-auto max-h-72">
                        <table class="min-w-full divide-y divide-gray-200">
                            <thead>
                                <tr>
                                    <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pregunta</th>
                                    <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dificultad</th>
                                    <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Discriminación</th>
                                </tr>
                            </thead>
                            <tbody id="${itemParametersTableId}" class="divide-y divide-gray-200">
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            
            <div class="mt-6 bg-gray-50 p-4 rounded-md">
                <h3 class="font-medium text-gray-700 mb-2">Análisis de Patrones de Dificultad</h3>
                
                <div id="${difficultyPatternsChartId}" class="chart-container" style="height: 300px;"></div>
                
                <div class="mt-2 text-sm text-gray-600">
                    <p>Este gráfico muestra las tasas de acierto para diferentes preguntas, clasificadas por su nivel de dificultad. Los patrones ayudan a identificar qué temas representan mayores desafíos para los participantes.</p>
                </div>
            </div>
        `
    });
    
    container.appendChild(irtCard);
    
    // Preparar datos para gráficos
    const irtBarData = data.irtData.slice(0, 15);
    
    // Preparar datos para gráfico de patrones
    const patternDataRaw = preparePatternData();
    
    // Ordenar por tasa de acierto
    const patternData = patternDataRaw
        .sort((a, b) => a.tasa_acierto - b.tasa_acierto)
        .slice(0, 15); // Limitar a 15 para mejor visualización
    
    // Esperar a que el DOM se actualice
    setTimeout(() => {
        try {
            // Crear visualizaciones IRT
            createCustomDifficultyChart(itemDifficultyChartId, irtBarData);
            createPieChart(categoryDistributionChartId, data.dificultadData, null);
            createCustomPatternChart(difficultyPatternsChartId, patternData);
            
            // Poblar tabla de parámetros de ítems
            populateItemParametersTable(itemParametersTableId, data.irtData);
        } catch (error) {
            console.error("Error al renderizar vista IRT:", error);
            document.getElementById(itemDifficultyChartId).innerHTML = `
                <div class="error-container">Error al crear visualizaciones IRT</div>
            `;
        }
    }, 100);
}

/**
 * Prepara los datos de patrones para gráficos
 * @returns {Array} - Datos de patrones preparados
 */
function preparePatternData() {
    const patternDataRaw = [];
    
    Object.entries(dashboardData.recomendacionesPedagogicas.patrones_dificultad || {}).forEach(([categoria, dificultades]) => {
        // Más difícil
        if (dificultades.mas_dificil && dificultades.mas_dificil.length > 0) {
            dificultades.mas_dificil.forEach(pregunta => {
                patternDataRaw.push({
                    categoria,
                    pregunta: pregunta.pregunta.substring(0, 30) + "...",
                    tasa_acierto: pregunta.tasa_acierto,
                    dificultad: "Más difícil",
                    nivel: 3
                });
            });
        }
        
        // Esperado
        if (dificultades.esperado && dificultades.esperado.length > 0) {
            dificultades.esperado.forEach(pregunta => {
                patternDataRaw.push({
                    categoria,
                    pregunta: pregunta.pregunta.substring(0, 30) + "...",
                    tasa_acierto: pregunta.tasa_acierto,
                    dificultad: "Esperado",
                    nivel: 2
                });
            });
        }
        
        // Más fácil
        if (dificultades.mas_facil && dificultades.mas_facil.length > 0) {
            dificultades.mas_facil.forEach(pregunta => {
                patternDataRaw.push({
                    categoria,
                    pregunta: pregunta.pregunta.substring(0, 30) + "...",
                    tasa_acierto: pregunta.tasa_acierto,
                    dificultad: "Más fácil",
                    nivel: 1
                });
            });
        }
    });
    
    return patternDataRaw;
}

/**
 * Puebla la tabla de parámetros de ítems
 * @param {string} tableId - ID de la tabla
 * @param {Array} irtData - Datos IRT
 */
function populateItemParametersTable(tableId, irtData) {
    const itemParametersTable = document.getElementById(tableId);
    if (!itemParametersTable) return;
    
    irtData.slice(0, 10).forEach((item, index) => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-900">${item.question}</td>
            <td class="px-4 py-2 whitespace-nowrap text-sm">
                ${renderDifficulty(item.difficulty)}
                <span class="text-gray-500 ml-1">(${item.difficulty.toFixed(2)})</span>
            </td>
            <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-500">${item.discrimination.toFixed(2)}</td>
        `;
        
        itemParametersTable.appendChild(row);
    });
}

/**
 * Renderiza la vista de recomendaciones pedagógicas
 * @param {HTMLElement} container - Contenedor donde renderizar
 * @param {Object} data - Datos para visualizaciones
 */
function renderRecomendacionesView(container, data) {
    // Crear identificadores únicos
    const sequenceRecommendationId = 'sequence-recommendation-container-' + Date.now();
    const skillsDistributionId = 'skills-distribution-container-' + Date.now();
    const areaRecommendationsId = 'area-recommendations-container-' + Date.now();
    
    // Crear tarjeta de recomendaciones
    const recomendacionesCard = createCard({
        title: 'Recomendaciones Pedagógicas',
        content: `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h3 class="font-medium text-gray-700 mb-2">Secuencia de Aprendizaje Recomendada</h3>
                    
                    <div id="${sequenceRecommendationId}"></div>
                    
                    <div class="mt-6">
                        <h3 class="font-medium text-gray-700 mb-2">Distribución de Nivel de Habilidades</h3>
                        
                        <div id="${skillsDistributionId}" class="max-h-96 overflow-auto pr-2">
                        </div>
                    </div>
                </div>
                
                <div>
                    <h3 class="font-medium text-gray-700 mb-2">Recomendaciones por Área</h3>
                    
                    <div id="${areaRecommendationsId}" class="overflow-auto max-h-screen pr-2">
                    </div>
                </div>
            </div>
        `
    });
    
    container.appendChild(recomendacionesCard);
    
    // Esperar a que el DOM se actualice
    setTimeout(() => {
        try {
            // Crear componente de secuencia
            createSequenceComponent(sequenceRecommendationId, data.secuenciaData);
            
            // Poblar distribución de habilidades
            populateSkillsDistribution(skillsDistributionId);
            
            // Poblar recomendaciones por área
            populateAreaRecommendations(areaRecommendationsId);
        } catch (error) {
            console.error("Error al renderizar vista de recomendaciones:", error);
            document.getElementById(sequenceRecommendationId).innerHTML = `
                <div class="error-container">Error al crear visualizaciones de recomendaciones</div>
            `;
        }
    }, 100);
}

/**
 * Puebla la distribución de habilidades
 * @param {string} containerId - ID del contenedor
 */
function populateSkillsDistribution(containerId) {
    const skillsDistributionContainer = document.getElementById(containerId);
    if (!skillsDistributionContainer) return;
    
    Object.entries(dashboardData.recomendacionesPedagogicas.recomendaciones_habilidades || {}).forEach(([habilidad, info]) => {
        const skillCard = document.createElement('div');
        skillCard.className = 'mb-4';
        
        skillCard.innerHTML = `
            <div class="flex justify-between items-center mb-1">
                <h4 class="text-sm font-medium text-gray-700">${habilidad}</h4>
                <div class="text-xs text-gray-500">${info.estrategia}</div>
            </div>
            
            <div class="flex items-center mb-2">
                <div class="w-full bg-gray-200 rounded-full h-3">
                    <div class="flex h-3">
                        <div class="bg-red-500 h-3 rounded-l-full" style="width: ${info.distribucion.bajo * 10}%"></div>
                        <div class="bg-yellow-500 h-3" style="width: ${info.distribucion.medio * 10}%"></div>
                        <div class="bg-green-500 h-3" style="width: ${info.distribucion.alto * 10}%"></div>
                        <div class="bg-blue-500 h-3 rounded-r-full" style="width: ${info.distribucion.muy_alto * 10}%"></div>
                    </div>
                </div>
            </div>
            
            <div class="flex justify-between text-xs text-gray-500">
                <div>Bajo: ${info.distribucion.bajo}</div>
                <div>Medio: ${info.distribucion.medio}</div>
                <div>Alto: ${info.distribucion.alto}</div>
                <div>Muy alto: ${info.distribucion.muy_alto}</div>
            </div>
            
            <div class="mt-2 text-xs bg-blue-50 p-2 rounded">
                <div class="font-medium text-blue-800">Actividades recomendadas:</div>
                <ul class="list-disc pl-4 text-gray-700 mt-1">
                    ${info.actividades.slice(0, 2).map(act => `<li>${act}</li>`).join('')}
                </ul>
            </div>
        `;
        
        skillsDistributionContainer.appendChild(skillCard);
    });
}

/**
 * Puebla las recomendaciones por área
 * @param {string} containerId - ID del contenedor
 */
function populateAreaRecommendations(containerId) {
    const areaRecommendationsContainer = document.getElementById(containerId);
    if (!areaRecommendationsContainer) return;
    
    Object.entries(dashboardData.recomendacionesPedagogicas.recomendaciones_areas || {}).forEach(([area, recomendaciones]) => {
        const areaCard = document.createElement('div');
        areaCard.className = 'border border-gray-200 rounded-md p-4 mb-4 hover:shadow-md transition-shadow';
        
        let areaContent = `<h4 class="font-medium text-gray-800 mb-3">${area}</h4>`;
        
        recomendaciones.forEach((rec, index) => {
            const bgColor = rec.tipo === 'refuerzo prioritario' 
                ? 'bg-red-50' 
                : rec.tipo === 'atención especial'
                    ? 'bg-yellow-50'
                    : 'bg-blue-50';
            
            const textColor = rec.tipo === 'refuerzo prioritario' 
                ? 'text-red-700' 
                : rec.tipo === 'atención especial'
                    ? 'text-yellow-700'
                    : 'text-blue-700';
            
            areaContent += `
                <div class="mb-3 p-3 rounded ${bgColor}">
                    <div class="text-sm font-medium mb-1 ${textColor}">${rec.tipo}</div>
                    <p class="text-sm text-gray-600">${rec.descripcion}</p>
                    
                    ${rec.actividades && rec.actividades.length > 0 ? `
                        <div class="mt-2">
                            <div class="text-xs font-medium text-gray-700">Actividades:</div>
                            <ul class="list-disc pl-4 text-xs text-gray-600 mt-1">
                                ${rec.actividades.slice(0, 2).map(act => `<li>${act}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                </div>
            `;
        });
        
        areaCard.innerHTML = areaContent;
        areaRecommendationsContainer.appendChild(areaCard);
    });
}