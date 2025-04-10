// charts.js - Manejo de visualizaciones usando Chart.js y D3.js

/**
 * Formatea un número para mostrar como máximo un decimal y sin decimales si es entero
 * @param {number} value - Valor a formatear
 * @returns {string} - Valor formateado
 */
function formatNumber(value) {
    if (Number.isInteger(value)) {
        return value.toString();
    }
    return value.toFixed(1);
}

/**
 * Formatea un número para mostrar un decimal
 * @param {number} value - Valor a formatear
 * @returns {number} - Valor formateado
 */
function formatToOneDecimal(value) {
    if (value === null || value === undefined) return null;
    return Number(parseFloat(value).toFixed(1));
}

/**
 * Aplica la configuración de tema oscuro a Chart.js
 * Debe ejecutarse cuando se cambia al tema oscuro
 */
function applyChartDarkMode(isDark = true) {
    // Configuración global para todos los gráficos Chart.js
    Chart.defaults.color = isDark ? '#e2e8f0' : '#333333';
    Chart.defaults.borderColor = isDark ? '#374151' : '#e5e7eb';
    
    // Reconfigurar colores para tema oscuro/claro
    window.CHART_COLORS = isDark ? [
        '#60a5fa', '#34d399', '#fbbf24', '#f87171', '#a78bfa',
        '#4ade80', '#fb923c', '#06b6d4', '#ec4899', '#94a3b8'
    ] : [
        '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8',
        '#82ca9d', '#ffc658', '#d53e4f', '#f46d43', '#fdae61'
    ];
    
    // Actualizar los colores base para gráficos
    window.COLORS = window.CHART_COLORS;
    
    // Regenerar todos los gráficos activos
    regenerateAllCharts();
}

/**
 * Regenera todos los gráficos activos
 * Útil después de cambiar el tema
 */
function regenerateAllCharts() {
    // Chart.instances no es un array en nuevas versiones de Chart.js
    // Obtener todas las instancias activas de una manera segura
    const chartInstances = Object.values(Chart.instances || {});
    
    // Destruir todas las instancias existentes de Chart.js
    if (Array.isArray(chartInstances)) {
        chartInstances.forEach(instance => {
            if (instance && typeof instance.destroy === 'function') {
                try {
                    instance.destroy();
                } catch (error) {
                    console.warn('Error al destruir gráfico:', error);
                }
            }
        });
    }
    
    // Si hay datos disponibles, volver a renderizar las visualizaciones
    if (window.dashboardData && !window.dashboardData.loading) {
        const data = prepareVisualizationData();
        if (data) {
            try {
                // Renderizar gráficos según la vista actual
                switch (app.currentView) {
                    case 'general':
                        renderGeneralViewCharts(data);
                        break;
                    case 'individual':
                        if (app.selectedParticipant) {
                            renderIndividualViewCharts(app.selectedParticipant);
                        }
                        break;
                    case 'curso':
                        if (app.selectedModule) {
                            renderCursoViewCharts(app.selectedModule);
                        }
                        break;
                    case 'analitica':
                        renderAnaliticaViewCharts(app.currentSubview, data);
                        break;
                }
            } catch (error) {
                console.error('Error al regenerar gráficos:', error);
            }
        }
    }
}

/**
 * Renderiza los gráficos de la vista general
 */
function renderGeneralViewCharts(data) {
    try {
        // Crear el gráfico de habilidades grupales
        createGroupSkillsChart('group-skills-chart');
        
        createPieChart('profiles-chart', data.clusterDistribution, null);
        createBarChart('objectives-chart', data.objetivosMasComunes, 'Objetivos', true);
        createBarChart('areas-chart', data.areasMasComunes, 'Áreas de Interés', true);
        createPieChart('difficulty-chart', data.dificultadData, null);
        createProgressBar('variance-bar', dashboardData.analisisFactorial.total_explained_variance * 100, 100);
        createSequenceComponent('sequence-container', data.secuenciaData);
        
        // Poblar leyenda de perfiles
        populateProfilesLegend(data);
        
        // Poblar tabla de componentes
        populateComponentsTable(data.factorialComponentsData);
    } catch (error) {
        console.error('Error al crear visualizaciones en vista general:', error);
    }
}

/**
 * Mejora las opciones para gráficos de tipo Radar para mejor visibilidad en tema oscuro
 * @param {object} options - Opciones actuales
 * @returns {object} - Opciones mejoradas
 */
function enhanceRadarChartOptions(options) {
    const isDarkTheme = document.documentElement.classList.contains('dark-theme');
    
    if (isDarkTheme) {
        // Asegurar que las opciones existan
        options = options || {};
        options.scales = options.scales || {};
        options.scales.r = options.scales.r || {};
        options.scales.r.ticks = options.scales.r.ticks || {};
        options.scales.r.pointLabels = options.scales.r.pointLabels || {};
        options.plugins = options.plugins || {};
        
        // Mejorar visibilidad
        options.scales.r.ticks.color = '#e2e8f0';
        options.scales.r.pointLabels.color = '#e2e8f0';
        options.scales.r.grid = options.scales.r.grid || {};
        options.scales.r.angleLines = options.scales.r.angleLines || {};
        options.scales.r.grid.color = 'rgba(255, 255, 255, 0.1)';
        options.scales.r.angleLines.color = 'rgba(255, 255, 255, 0.2)';
    }
    
    return options;
}

/**
 * Mejora las opciones para gráficos tipo barra para mejor visibilidad en tema oscuro
 * @param {object} options - Opciones actuales
 * @returns {object} - Opciones mejoradas
 */
function enhanceBarChartOptions(options) {
    const isDarkTheme = document.documentElement.classList.contains('dark-theme');
    
    if (isDarkTheme) {
        // Asegurar que las opciones existan
        options = options || {};
        options.scales = options.scales || {};
        options.scales.x = options.scales.x || {};
        options.scales.y = options.scales.y || {};
        options.plugins = options.plugins || {};
        
        // Mejorar visibilidad
        options.scales.x.ticks = options.scales.x.ticks || {};
        options.scales.y.ticks = options.scales.y.ticks || {};
        
        options.scales.x.ticks.color = '#e2e8f0';
        options.scales.y.ticks.color = '#e2e8f0';
        options.scales.x.grid = options.scales.x.grid || {};
        options.scales.y.grid = options.scales.y.grid || {};
        options.scales.x.grid.color = 'rgba(255, 255, 255, 0.05)';
        options.scales.y.grid.color = 'rgba(255, 255, 255, 0.05)';
    }
    
    return options;
}

/**
 * Formatea un nombre/texto para mostrar con una longitud máxima
 * @param {string} text - Texto a formatear
 * @param {number} maxLength - Longitud máxima
 * @returns {string} - Texto formateado
 */
function formatName(text, maxLength = 40) {
    if (!text) return "";
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

/**
 * Crea un gráfico radar para visualizar habilidades
 * @param {string} containerId - ID del contenedor para el gráfico
 * @param {Array} data - Datos para el gráfico radar
 * @param {string|null} title - Título del gráfico (opcional)
 */
function createSkillsRadarChart(containerId, data, title = "Habilidades") {
    const container = document.getElementById(containerId);
    // Verificar si el contenedor existe
    if (!container) {
        console.error(`Elemento con ID "${containerId}" no encontrado`);
        return;
    }
    
    // Limpiar el contenedor
    container.innerHTML = '';
    
    const canvas = document.createElement('canvas');
    container.appendChild(canvas);
    
    const ctx = canvas.getContext('2d');
    
    const processedData = data.map(item => ({
        ...item,
        value: item.value ? formatToOneDecimal(item.value) : null,
        Participante: item.Participante ? formatToOneDecimal(item.Participante) : null,
        Grupo: item.Grupo ? formatToOneDecimal(item.Grupo) : null
    }));
    const labels = processedData.map(item => item.subject);
    const values = processedData.map(item => item.value || item.Participante);
    const groupValues = processedData.map(item => item.Grupo || null);
    
    const datasets = [
        {
            label: 'Nivel',
            data: values,
            fill: true,
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            borderColor: 'rgb(54, 162, 235)',
            pointBackgroundColor: 'rgb(54, 162, 235)',
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: 'rgb(54, 162, 235)'
        }
    ];
    
    // Si hay datos de grupo, añadirlos como segundo dataset
    if (groupValues[0] !== null) {
        datasets.push({
            label: 'Promedio Grupo',
            data: groupValues,
            fill: true,
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            borderColor: 'rgb(255, 99, 132)',
            pointBackgroundColor: 'rgb(255, 99, 132)',
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: 'rgb(255, 99, 132)'
        });
    }
    
    try {
        let options = {
            responsive: true,
            maintainAspectRatio: false,
            devicePixelRatio: window.devicePixelRatio || 1,
            elements: {
                line: {
                    borderWidth: 3
                }
            },
            plugins: {
                title: {
                    display: title !== null,
                    text: title,
                    font: {
                        size: 16,
                        weight: 'bold'
                    }
                },
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
                            return value.toFixed(1) + '%';
                        }
                    },
                    pointLabels: {
                        font: {
                            size: 12
                        }
                    }
                }
            }
        };
        
        // Mejorar opciones para tema oscuro si es necesario
        options = enhanceRadarChartOptions(options);
        
        new Chart(ctx, {
            type: 'radar',
            data: {
                labels: labels,
                datasets: datasets
            },
            options: options
        });
    } catch (error) {
        console.error(`Error al crear gráfico radar:`, error);
        container.innerHTML = `<div class="error-container">Error al crear el gráfico: ${error.message}</div>`;
    }
}

/**
 * Función auxiliar para agregar un elemento hijo a un padre de forma segura
 * @param {HTMLElement} parent - Elemento padre
 * @param {HTMLElement} child - Elemento hijo
 */
function safeAppendChild(parent, child) {
    if (parent) {
        parent.appendChild(child);
    } else {
        console.warn("Advertencia: el elemento padre es nulo, no se puede agregar el hijo");
    }
}

/**
 * Crea un gráfico de barras
 * @param {string} containerId - ID del contenedor para el gráfico
 * @param {Array} data - Datos para el gráfico de barras
 * @param {string|null} title - Título del gráfico (opcional)
 * @param {boolean} horizontal - Si el gráfico debe ser horizontal
 */
function createBarChart(containerId, data, title, horizontal = false) {
    const container = document.getElementById(containerId);
    // Verificar si el contenedor existe
    if (!container) {
        console.error(`Elemento con ID "${containerId}" no encontrado`);
        return;
    }
    
    // Limpiar el contenedor
    container.innerHTML = '';
    
    const canvas = document.createElement('canvas');
    safeAppendChild(container, canvas);
    
    const ctx = canvas.getContext('2d');
    
    const indexAxis = horizontal ? 'y' : 'x';
    
    try {
        let options = {
            responsive: true,
            maintainAspectRatio: false,
            devicePixelRatio: window.devicePixelRatio || 1,
            indexAxis: indexAxis,
            plugins: {
                title: {
                    display: title !== null,
                    text: title,
                    font: {
                        size: 16,
                        weight: 'bold'
                    }
                },
                legend: {
                    display: false
                },
                // Agregar etiquetas de datos
                datalabels: {
                    color: function(context) {
                        // Color oscuro para barras claras, color claro para barras oscuras
                        const value = context.dataset.data[context.dataIndex];
                        const max = Math.max(...context.dataset.data);
                        return value > max * 0.7 ? '#fff' : '#333';
                    },
                    anchor: horizontal ? 'end' : 'end',
                    align: horizontal ? 'right' : 'top',
                    formatter: function(value) {
                        return value.toFixed(1);
                    },
                    font: {
                        weight: 'bold'
                    },
                    padding: 6
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${formatNumber(context.raw)} ${context.raw === 1 ? 'participante' : 'participantes'}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        drawBorder: false,
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        callback: function(value) {
                            return value.toFixed(1);
                        }
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45,
                        callback: function(value) {
                            return value.toFixed(1);
                        }
                    }
                }
            },
            animation: {
                duration: 1000,
                easing: 'easeOutQuart'
            }
        };
        
        // Mejorar opciones para tema oscuro si es necesario
        options = enhanceBarChartOptions(options);
        
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(item => item.name),
                datasets: [{
                    label: title,
                    data: data.map(item => item.value),
                    backgroundColor: data.map((_, index) => COLORS[index % COLORS.length]),
                    borderColor: data.map((_, index) => COLORS[index % COLORS.length]),
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: options
        });
    } catch (error) {
        console.error(`Error al crear gráfico de barras:`, error);
        container.innerHTML = `<div class="error-container">Error al crear el gráfico: ${error.message}</div>`;
    }
}

/**
 * Crea un gráfico circular
 * @param {string} containerId - ID del contenedor para el gráfico
 * @param {Array} data - Datos para el gráfico circular
 * @param {string|null} title - Título del gráfico (opcional)
 */
function createPieChart(containerId, data, title) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Elemento con ID "${containerId}" no encontrado`);
        return;
    }
    
    // Limpiar el contenedor
    container.innerHTML = '';
    
    const canvas = document.createElement('canvas');
    safeAppendChild(container, canvas);
    
    const ctx = canvas.getContext('2d');
    
    try {
        new Chart(ctx, {
            type: 'pie',
            data: {
                labels: data.map(item => item.name),
                datasets: [{
                    data: data.map(item => item.value),
                    backgroundColor: data.map((_, index) => COLORS[index % COLORS.length]),
                    borderColor: '#fff',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                devicePixelRatio: window.devicePixelRatio || 1,
                plugins: {
                    title: {
                        display: title !== null,
                        text: title,
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    },
                    // Agregar etiquetas de datos
                    datalabels: {
                        color: '#fff',
                        font: {
                            weight: 'bold',
                            size: 12
                        },
                        formatter: (value, ctx) => {
                            const dataset = ctx.chart.data.datasets[0];
                            const total = dataset.data.reduce((acc, data) => acc + data, 0);
                            const percentage = ((value / total) * 100).toFixed(1) + '%';
                            return percentage;
                        },
                        display: function(context) {
                            return context.dataset.data[context.dataIndex] > 5;
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const value = context.parsed;
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${context.label}: ${value} (${percentage}%)`;
                            }
                        }
                    },
                    legend: {
                        position: 'right',
                        labels: {
                            padding: 15,
                            usePointStyle: true,
                            pointStyle: 'circle'
                        }
                    }
                },
                animation: {
                    animateRotate: true,
                    animateScale: true
                },
                // Hacerlo visualmente más atractivo
                cutout: '0%',
                radius: '90%'
            }
        });
    } catch (error) {
        console.error(`Error al crear gráfico circular:`, error);
        container.innerHTML = `<div class="error-container">Error al crear el gráfico: ${error.message}</div>`;
    }
}

/**
 * Crea un gráfico de línea
 * @param {string} containerId - ID del contenedor para el gráfico
 * @param {Array} data - Datos para el gráfico de línea
 * @param {Array} labels - Etiquetas para el eje X
 * @param {string|null} title - Título del gráfico (opcional)
 */
function createLineChart(containerId, data, labels, title) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Elemento con ID "${containerId}" no encontrado`);
        return;
    }
    
    // Limpiar el contenedor
    container.innerHTML = '';
    
    const canvas = document.createElement('canvas');
    safeAppendChild(container, canvas);
    
    const ctx = canvas.getContext('2d');
    
    try {
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: data.map((dataset, index) => ({
                    label: dataset.label,
                    data: dataset.data,
                    fill: false,
                    backgroundColor: COLORS[index % COLORS.length],
                    borderColor: COLORS[index % COLORS.length],
                    tension: 0.2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }))
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                devicePixelRatio: window.devicePixelRatio || 1,
                plugins: {
                    title: {
                        display: title !== null,
                        text: title,
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: ${formatNumber(context.raw)}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            callback: function(value) {
                                return value.toFixed(1);
                            }
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            callback: function(value) {
                                return value.toFixed(1);
                            }
                        }
                    }
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                },
                animation: {
                    duration: 1000
                }
            }
        });
    } catch (error) {
        console.error(`Error al crear gráfico de línea:`, error);
        container.innerHTML = `<div class="error-container">Error al crear el gráfico: ${error.message}</div>`;
    }
}

/**
 * Crea un gráfico de dispersión (scatter) para clustering
 * @param {string} containerId - ID del contenedor para el gráfico
 * @param {Array} data - Datos para el gráfico de dispersión
 * @param {string|null} title - Título del gráfico (opcional)
 */
function createScatterChart(containerId, data, title) {
    const container = document.getElementById(containerId);
    // Verificar si el contenedor existe
    if (!container) {
        console.error(`Elemento con ID "${containerId}" no encontrado`);
        return;
    }
    
    // Limpiar el contenedor
    container.innerHTML = '';
    
    // Dimensiones y márgenes
    const width = container.clientWidth;
    const height = container.clientHeight || 400;
    const margin = {top: 20, right: 20, bottom: 30, left: 40};
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    // Crear el elemento SVG
    const svg = d3.select(container)
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // Escalas X e Y
    const xValues = data.map(d => d.x);
    const yValues = data.map(d => d.y);
    
    const xScale = d3.scaleLinear()
        .domain([d3.min(xValues) - 10, d3.max(xValues) + 10])
        .range([0, innerWidth]);
    
    const yScale = d3.scaleLinear()
        .domain([d3.min(yValues) - 10, d3.max(yValues) + 10])
        .range([innerHeight, 0]);
    
    // Ejes
    svg.append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .attr("class", "axis x-axis")
        .call(d3.axisBottom(xScale))
        .selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em")
        .attr("transform", "rotate(-45)");
    
    svg.append("g")
        .attr("class", "axis y-axis")
        .call(d3.axisLeft(yScale));
    
    // Etiquetas de los ejes
    svg.append("text")
        .attr("transform", `translate(${innerWidth / 2}, ${innerHeight + margin.bottom})`)
        .style("text-anchor", "middle")
        .attr("fill", "#666")
        .attr("font-size", "12px")
        .text("Dimensión 1");
    
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - margin.left)
        .attr("x", 0 - (innerHeight / 2))
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .attr("fill", "#666")
        .attr("font-size", "12px")
        .text("Dimensión 2");
    
    // Agregar título
    if (title) {
        svg.append("text")
            .attr("x", innerWidth / 2)
            .attr("y", 0 - (margin.top / 2))
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .style("font-weight", "bold")
            .text(title);
    }
    
    // Crear elementos tooltip
    const tooltip = d3.select(container)
        .append("div")
        .style("opacity", 0)
        .attr("class", "chart-tooltip")
        .style("background-color", "rgba(0, 0, 0, 0.8)")
        .style("color", "white")
        .style("border-radius", "5px")
        .style("padding", "10px")
        .style("position", "absolute")
        .style("z-index", "10")
        .style("pointer-events", "none");
    
    // Funciones para el tooltip
    const mouseover = function(event, d) {
        tooltip.style("opacity", 1);
    };
    
    const mousemove = function(event, d) {
        tooltip
            .html(`<strong>Participante ${d.participante}</strong><br>Perfil: ${dashboardData.clustering.cluster_profiles[d.cluster].nombre_perfil}`)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 10) + "px");
    };
    
    const mouseleave = function(event, d) {
        tooltip.style("opacity", 0);
    };
    
    // Agregar áreas de clúster (opcional)
    const clusterGroups = d3.group(data, d => d.cluster);
    
    // Agregar los puntos con animación
    svg.selectAll("circle")
        .data(data)
        .enter()
        .append("circle")
        .attr("cx", d => xScale(d.x))
        .attr("cy", d => yScale(d.y))
        .attr("r", 0) // Empezar con radio 0 para animar
        .style("fill", d => d.fill)
        .style("opacity", 0.7)
        .style("stroke", "white")
        .style("stroke-width", 1.5)
        .on("mouseover", mouseover)
        .on("mousemove", mousemove)
        .on("mouseleave", mouseleave)
        .transition() // Animar aparición
        .duration(1000)
        .attr("r", 8);
    
    // Agregar etiquetas de clúster (centro promedio)
    const clusterCenters = Array.from(clusterGroups).map(([cluster, points]) => {
        const x = d3.mean(points, d => d.x);
        const y = d3.mean(points, d => d.y);
        return {
            cluster,
            x,
            y,
            name: dashboardData.clustering.cluster_profiles[cluster].nombre_perfil
        };
    });
    
    svg.selectAll(".cluster-label")
        .data(clusterCenters)
        .enter()
        .append("text")
        .attr("class", "cluster-label")
        .attr("x", d => xScale(d.x))
        .attr("y", d => yScale(d.y) - 15)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .style("font-weight", "bold")
        .style("fill", (d, i) => COLORS[parseInt(d.cluster) % COLORS.length])
        .style("opacity", 0)
        .text(d => d.name)
        .transition()
        .delay(1000)
        .duration(500)
        .style("opacity", 1);
}

/**
 * Crea un componente de secuencia (flujo de fases)
 * @param {string} containerId - ID del contenedor para el componente
 * @param {Array} data - Datos para la secuencia
 */
function createSequenceComponent(containerId, data) {
    const container = document.getElementById(containerId);
    // Verificar si el contenedor existe
    if (!container) {
        console.error(`Elemento con ID "${containerId}" no encontrado`);
        return;
    }
    
    // Limpiar el contenedor
    container.innerHTML = '';
    
    const sequenceContainer = document.createElement('div');
    sequenceContainer.className = 'sequence-container';
    sequenceContainer.style.display = 'flex';
    sequenceContainer.style.overflowX = 'auto';
    sequenceContainer.style.padding = '1rem 0';
    
    data.forEach((fase, index) => {
        const faseElement = document.createElement('div');
        faseElement.className = 'fase-item';
        faseElement.style.position = 'relative';
        faseElement.style.padding = '0 1rem';
        
        const faseCard = document.createElement('div');
        faseCard.className = 'fase-card';
        faseCard.style.width = '220px';
        faseCard.style.backgroundColor = '#e6f2ff';
        faseCard.style.padding = '1rem';
        faseCard.style.borderRadius = '0.5rem';
        faseCard.style.position = 'relative';
        faseCard.style.transition = 'transform 0.3s ease, box-shadow 0.3s ease';
        
        // Efecto de hover
        faseCard.addEventListener('mouseenter', () => {
            faseCard.style.transform = 'translateY(-5px)';
            faseCard.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
        });
        
        faseCard.addEventListener('mouseleave', () => {
            faseCard.style.transform = 'translateY(0)';
            faseCard.style.boxShadow = 'none';
        });
        
        // Número de fase (círculo)
        const faseNum = document.createElement('div');
        faseNum.className = 'fase-num';
        faseNum.textContent = fase.id;
        faseNum.style.position = 'absolute';
        faseNum.style.top = '-10px';
        faseNum.style.left = '-10px';
        faseNum.style.width = '30px';
        faseNum.style.height = '30px';
        faseNum.style.backgroundColor = '#3182ce';
        faseNum.style.color = 'white';
        faseNum.style.borderRadius = '50%';
        faseNum.style.display = 'flex';
        faseNum.style.alignItems = 'center';
        faseNum.style.justifyContent = 'center';
        faseNum.style.fontWeight = 'bold';
        faseCard.appendChild(faseNum);
        
        // Título de la fase
        const faseTitle = document.createElement('h3');
        faseTitle.className = 'fase-title';
        faseTitle.textContent = fase.fase.split(':')[0];
        faseTitle.style.color = '#1e40af';
        faseTitle.style.fontWeight = '600';
        faseTitle.style.marginBottom = '0.25rem';
        faseCard.appendChild(faseTitle);
        
        // Duración
        const faseDuration = document.createElement('div');
        faseDuration.className = 'fase-duration';
        faseDuration.textContent = fase.duracion;
        faseDuration.style.fontSize = '0.75rem';
        faseDuration.style.color = '#4b5563';
        faseDuration.style.marginBottom = '0.5rem';
        faseCard.appendChild(faseDuration);
        
        // Descripción
        const faseDescription = document.createElement('p');
        faseDescription.className = 'fase-description';
        faseDescription.textContent = formatName(fase.descripcion, 60);
        faseDescription.style.fontSize = '0.875rem';
        faseDescription.style.color = '#4b5563';
        faseCard.appendChild(faseDescription);
        
        // Temas
        const faseTemas = document.createElement('div');
        faseTemas.className = 'fase-temas';
        faseTemas.textContent = `${fase.temas} temas`;
        faseTemas.style.marginTop = '0.5rem';
        faseTemas.style.fontSize = '0.75rem';
        faseTemas.style.fontWeight = '500';
        faseTemas.style.color = '#1e40af';
        faseCard.appendChild(faseTemas);
        
        faseElement.appendChild(faseCard);
        
        // Flecha a la siguiente fase
        if (index < data.length - 1) {
            const arrow = document.createElement('div');
            arrow.className = 'fase-arrow';
            arrow.innerHTML = '→';
            arrow.style.position = 'absolute';
            arrow.style.top = '50%';
            arrow.style.right = '0';
            arrow.style.transform = 'translate(50%, -50%)';
            arrow.style.fontSize = '1.5rem';
            arrow.style.color = '#3182ce';
            arrow.style.zIndex = '10';
            faseElement.appendChild(arrow);
        }
        
        sequenceContainer.appendChild(faseElement);
    });
    
    container.appendChild(sequenceContainer);
    
    // Agregar botones de navegación (opcional)
    const navigationControls = document.createElement('div');
    navigationControls.className = 'sequence-navigation';
    navigationControls.style.display = 'flex';
    navigationControls.style.justifyContent = 'center';
    navigationControls.style.marginTop = '1rem';
    navigationControls.style.gap = '0.5rem';
    
    const scrollLeft = document.createElement('button');
    scrollLeft.textContent = '←';
    scrollLeft.className = 'px-3 py-1 bg-gray-100 text-gray-700 rounded';
    scrollLeft.addEventListener('click', () => {
        sequenceContainer.scrollBy({ left: -300, behavior: 'smooth' });
    });
    
    const scrollRight = document.createElement('button');
    scrollRight.textContent = '→';
    scrollRight.className = 'px-3 py-1 bg-gray-100 text-gray-700 rounded';
    scrollRight.addEventListener('click', () => {
        sequenceContainer.scrollBy({ left: 300, behavior: 'smooth' });
    });
    
    navigationControls.appendChild(scrollLeft);
    navigationControls.appendChild(scrollRight);
    container.appendChild(navigationControls);
}

/**
 * Crea una barra de progreso
 * @param {string} containerId - ID del contenedor para la barra
 * @param {number} value - Valor actual
 * @param {number} max - Valor máximo
 * @param {string} color - Color de la barra (opcional)
 * @returns {HTMLElement|null} - Elemento de barra de progreso o null si error
 */
function createProgressBar(containerId, value, max, color = '#3182ce') {
    const container = document.getElementById(containerId);
    // Verificar si el contenedor existe
    if (!container) {
        console.error(`Elemento con ID "${containerId}" no encontrado`);
        return null;
    }
    
    // Limpiar el contenedor
    container.innerHTML = '';
    
    // Determinar clase basada en el valor de progreso
    let colorClass = '';
    if (value < 25) colorClass = 'low';
    else if (value < 50) colorClass = 'medium';
    else if (value < 75) colorClass = 'high';
    else colorClass = 'very-high';
    
    const progressBar = document.createElement('div');
    progressBar.className = 'progress-bar';
    
    const progressValue = document.createElement('div');
    progressValue.className = `progress-value ${colorClass}`;
    progressValue.style.width = `0%`; // Iniciar en 0 para animar
    if (color !== '#3182ce') {
        progressValue.style.backgroundColor = color;
    }
    
    progressBar.appendChild(progressValue);
    safeAppendChild(container, progressBar);
    
    // Animar la barra de progreso
    setTimeout(() => {
        progressValue.style.width = `${(value / max) * 100}%`;
    }, 100);
    
    return progressBar;
}

/**
 * Crea un gráfico personalizado para mostrar dificultad de ítems
 * @param {string} containerId - ID del contenedor para el gráfico
 * @param {Array} data - Datos de dificultad
 */
function createCustomDifficultyChart(containerId, data) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Elemento con ID "${containerId}" no encontrado`);
        return;
    }
    
    // Limpiar el contenedor
    container.innerHTML = '';
    
    const canvas = document.createElement('canvas');
    safeAppendChild(container, canvas);
    
    const ctx = canvas.getContext('2d');
    
    // Preparar datos del gráfico
    const cleanedData = data.map(d => ({
        ...d,
        difficulty: formatToOneDecimal(d.difficulty),
        discrimination: formatToOneDecimal(d.discrimination)
    }));
    const labels = cleanedData.map(d => d.question);
    const values = cleanedData.map(d => d.difficulty);
    
    // Determinar colores basados en dificultad
    const colors = values.map(value => {
        if (value <= -2) return '#22c55e'; // Verde oscuro para muy fácil
        if (value <= 0) return '#4ade80'; // Verde para fácil
        if (value <= 1) return '#facc15'; // Amarillo para medio
        if (value <= 2) return '#fb923c'; // Naranja para difícil
        return '#ef4444'; // Rojo para muy difícil
    });
    
    try {
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Dificultad',
                    data: values,
                    backgroundColor: colors,
                    borderColor: colors,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                devicePixelRatio: window.devicePixelRatio || 1,
                indexAxis: 'y',
                scales: {
                    x: {
                        min: -5,
                        max: 3,
                        title: {
                            display: true,
                            text: 'Dificultad',
                            font: {
                                weight: 'bold'
                            }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            callback: function(value) {
                                return value.toFixed(1);
                            }
                        }
                    },
                    y: {
                        ticks: {
                            callback: function(value) {
                                const label = this.getLabelForValue(value);
                                return label.length > 25 
                                    ? label.substring(0, 25) + '...' 
                                    : label;
                            },
                            font: {
                                size: 11
                            }
                        },
                        grid: {
                            display: false
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const value = context.parsed.x;
                                let difficultyLabel = 'Muy difícil';
                                
                                if (value <= -2) difficultyLabel = 'Muy fácil';
                                else if (value <= 0) difficultyLabel = 'Fácil';
                                else if (value <= 1) difficultyLabel = 'Medio';
                                else if (value <= 2) difficultyLabel = 'Difícil';
                                
                                return `Dificultad: ${context.parsed.x.toFixed(1)} (${difficultyLabel})`;
                            }
                        }
                    },
                    legend: {
                        display: false
                    }
                },
                animation: {
                    duration: 1000
                }
            }
        });
    } catch (error) {
        console.error(`Error al crear gráfico de dificultad:`, error);
        container.innerHTML = `<div class="error-container">Error al crear el gráfico: ${error.message}</div>`;
    }
}

/**
 * Crea un gráfico personalizado para mostrar patrones de dificultad
 * @param {string} containerId - ID del contenedor para el gráfico
 * @param {Array} data - Datos de patrones
 */
function createCustomPatternChart(containerId, data) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Elemento con ID "${containerId}" no encontrado`);
        return;
    }
    
    // Limpiar el contenedor
    container.innerHTML = '';
    
    const canvas = document.createElement('canvas');
    safeAppendChild(container, canvas);
    
    const ctx = canvas.getContext('2d');
    
    // Preparar datos del gráfico
    const labels = data.map(d => d.pregunta);
    const values = data.map(d => d.tasa_acierto);
    
    // Determinar colores basados en dificultad
    const colors = data.map(d => {
        if (d.dificultad === "Más fácil") return '#22c55e'; // Verde para más fácil
        if (d.dificultad === "Esperado") return '#3b82f6'; // Azul para esperado
        return '#ef4444'; // Rojo para más difícil
    });
    
    try {
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Tasa de acierto (%)',
                    data: values,
                    backgroundColor: colors,
                    borderColor: colors.map(color => color.replace(')', ', 0.8)').replace('rgb', 'rgba')),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                devicePixelRatio: window.devicePixelRatio || 1,
                scales: {
                    x: {
                        ticks: {
                            callback: function(value) {
                                return this.getLabelForValue(value).length > 15 
                                    ? this.getLabelForValue(value).substring(0, 15) + '...' 
                                    : this.getLabelForValue(value);
                            },
                            maxRotation: 45,
                            minRotation: 45,
                            font: {
                                size: 10
                            }
                        },
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        beginAtZero: true,
                        max: 100,
                        title: {
                            display: true,
                            text: 'Tasa de acierto (%)',
                            font: {
                                weight: 'bold'
                            }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            callback: function(value) {
                                return value.toFixed(1);
                            }
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const dataItem = data[context.dataIndex];
                                return [
                                    `Tasa de acierto: ${context.parsed.y.toFixed(1)}%`,
                                    `Dificultad: ${dataItem.dificultad}`,
                                    `Categoría: ${dataItem.categoria}`
                                ];
                            }
                        }
                    },
                    legend: {
                        display: false
                    }
                },
                animation: {
                    delay: function(context) {
                        return context.dataIndex * 50;
                    },
                    duration: 800
                }
            }
        });
    } catch (error) {
        console.error(`Error al crear gráfico de patrones:`, error);
        container.innerHTML = `<div class="error-container">Error al crear el gráfico: ${error.message}</div>`;
    }
}