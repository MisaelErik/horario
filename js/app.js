// --- LÓGICA DE LA APLICACIÓN ---
        
        let selectedCourses = [];
        const colors = ['#a7f3d0', '#bae6fd', '#fef08a', '#fecaca', '#e9d5ff', '#fed7aa', '#d1fae5', '#cffafe', '#fde68a', '#fee2e2'];
        let courseColorMap = {};
        let colorIndex = 0;

        const courseListContainer = document.getElementById('course-list');
        const scheduleBody = document.getElementById('schedule-body');
        const selectedCoursesList = document.getElementById('selected-courses-list');
        const conflictModal = document.getElementById('conflict-modal');
        const modalContent = document.getElementById('modal-content');
        const conflictMessage = document.getElementById('conflict-message');
        const creditCountSpan = document.getElementById('credit-count');
        const downloadPngBtn = document.getElementById('download-png-btn');
        const downloadPdfBtn = document.getElementById('download-pdf-btn');
        const downloadExcelBtn = document.getElementById('download-excel-btn');
        const saveScheduleBtn = document.getElementById('save-schedule-btn');
        const clearScheduleBtn = document.getElementById('clear-schedule-btn');

        function timeToMinutes(timeStr) {
            const [hours, minutes] = timeStr.split(':').map(Number);
            return hours * 60 + minutes;
        }

        function parseTimeRange(horaStr) {
            const [startStr, endStr] = horaStr.split(' a ');
            return {
                start: timeToMinutes(startStr.trim()),
                end: timeToMinutes(endStr.trim().replace('.', '')),
            };
        }

        function getConflict(newClass) {
            const newRange = parseTimeRange(newClass.hora);
            for (const selected of selectedCourses) {
                for (const existingClass of selected.seccion.clases) {
                    if (existingClass.dia === newClass.dia) {
                        const existingRange = parseTimeRange(existingClass.hora);
                        if (newRange.start < existingRange.end && newRange.end > existingRange.start) {
                            return selected; // Devuelve el curso con el que hay conflicto
                        }
                    }
                }
            }
            return null; // No hay conflicto
        }
        
        function showConflictModal(message) {
            conflictMessage.textContent = message || 'El curso que intentas agregar se cruza con otro ya seleccionado.';
            conflictModal.classList.remove('hidden');
            conflictModal.classList.add('flex');
            setTimeout(() => {
                modalContent.classList.remove('scale-95', 'opacity-0');
            }, 10);
        }

        function closeModal() {
            modalContent.classList.add('scale-95', 'opacity-0');
            setTimeout(() => {
                conflictModal.classList.add('hidden');
                conflictModal.classList.remove('flex');
            }, 200);
        }

        function selectSection(courseCode, sectionId) {
    const course = coursesData.find(c => c.codigo === courseCode);
    const section = course.secciones.find(s => s.id === sectionId);
    const newCourseData = { curso: course, seccion: section };

    for (const clase of section.clases) {
        const conflictingCourse = getConflict(clase);
        if (conflictingCourse) {
            // Guardar el estado del conflicto para que los botones de la modal puedan usarlo
            conflictToResolve = {
                newCourse: newCourseData,
                conflicting: conflictingCourse
            };
            const message = `El curso ${course.nombre} (Sec ${section.id}) se cruza con ${conflictingCourse.curso.nombre} (Sec ${conflictingCourse.seccion.id}). ¿Deseas reemplazarlo?`;
            showConflictModal(message);
            return; // Detener la ejecución hasta que el usuario decida en la modal
        }
    }

    // Si no hay conflictos, proceder a agregar el curso
    addCourse(newCourseData);
}

        function addCourse(courseData) {
    // Eliminar si ya existía una sección del mismo curso
    const existingCourseIndex = selectedCourses.findIndex(c => c.curso.codigo === courseData.curso.codigo);
    if (existingCourseIndex !== -1) {
        selectedCourses.splice(existingCourseIndex, 1);
    }

    if (!courseColorMap[courseData.curso.codigo]) {
        courseColorMap[courseData.curso.codigo] = colors[colorIndex % colors.length];
        colorIndex++;
    }

    selectedCourses.push(courseData);
    updateUI();
}


function removeCourse(courseCode) {
            selectedCourses = selectedCourses.filter(c => c.curso.codigo !== courseCode);
            const radioButtons = document.querySelectorAll(`input[name="course-${courseCode}"]`);
            radioButtons.forEach(radio => radio.checked = false);
            updateUI();
        }

        function clearSchedule() {
            selectedCourses = [];
            document.querySelectorAll('input[type="radio"]').forEach(radio => radio.checked = false);
            updateUI();
        }

        function renderCourseList() {
            const coursesByCycle = coursesData.reduce((acc, course) => {
                const cycleKey = course.ciclo;
                if (!acc[cycleKey]) {
                    acc[cycleKey] = [];
                }
                acc[cycleKey].push(course);
                return acc;
            }, {});

            courseListContainer.innerHTML = Object.keys(coursesByCycle).sort((a,b) => romanToInt(a) - romanToInt(b)).map(ciclo => {
                const coursesHTML = coursesByCycle[ciclo].map(course => {
                    const sectionsHTML = course.secciones.map(section => `
                        <label class="flex items-start p-2 rounded-md hover:bg-gray-100 cursor-pointer">
                            <input type="radio" name="course-${course.codigo}" value="${section.id}" class="mt-1" onchange="selectSection('${course.codigo}', '${section.id}')">
                            <div class="ml-3 text-sm">
                                <p class="font-semibold">Sección ${section.id}</p>
                                <p class="text-gray-600">${section.docente}</p>
                                <div class="text-xs text-gray-500 mt-1">
                                    ${section.clases.map(c => `<span>${c.dia}: ${c.hora} (${c.aula})</span>`).join('<br>')}
                                </div>
                            </div>
                        </label>
                    `).join('');

                    return `
                        <div class="border rounded-lg p-3">
                            <p class="font-bold">${course.nombre}</p>
                            <p class="text-xs text-gray-500 mb-2">Código: ${course.codigo} | Créditos: ${course.creditos}</p>
                            <div class="space-y-2">${sectionsHTML}</div>
                        </div>
                    `;
                }).join('');

                return `
                    <div class="border rounded-lg overflow-hidden">
                        <div class="cycle-header bg-blue-50 p-3 flex justify-between items-center" onclick="toggleCycle(this)">
                            <h3 class="text-lg font-semibold text-blue-800">CICLO ${ciclo}</h3>
                            <svg class="h-6 w-6 text-blue-800" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
                        </div>
                        <div class="cycle-courses p-2 space-y-3 hidden">
                            ${coursesHTML}
                        </div>
                    </div>
                `;
            }).join('');
        }
        
        function renderSchedule() {
    const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const timeSlots = [
        { start: '08:00', end: '09:40' },
        { start: '09:40', end: '11:20' },
        { start: '11:20', end: '13:00' },
        { start: '13:00', end: '14:40' },
        { start: '14:40', end: '16:20' },
        { start: '16:20', end: '18:00' },
        { start: '18:00', end: '19:40' },
        { start: '19:40', end: '21:20' },
        { start: '21:20', end: '22:10' }
    ];
    const standardStartTimes = timeSlots.map(slot => slot.start);
    const rowHeight = 80; // pixels
    const scheduleTable = document.getElementById('schedule-table');
    const scheduleBody = document.getElementById('schedule-body');

    // Limpiar el body
    scheduleBody.innerHTML = '';

    // 1. Crear la rejilla de la tabla
    let tableRowsHTML = '';
    timeSlots.forEach(slot => {
        tableRowsHTML += `<tr><td class="border p-2 bg-gray-50 font-medium text-xs h-[${rowHeight}px]">${slot.start} - ${slot.end}</td>`;
        days.forEach(day => {
            tableRowsHTML += `<td class="border schedule-cell"></td>`;
        });
        tableRowsHTML += `</tr>`;
    });
    scheduleBody.innerHTML = tableRowsHTML;

    // 2. Renderizar los bloques de curso directamente en las celdas
    // Esperar a que la tabla se renderice para obtener las referencias a las celdas
    setTimeout(() => {
        selectedCourses.forEach(selected => {
            const course = selected.curso;
            const section = selected.seccion;
            const color = courseColorMap[course.codigo];

            section.clases.forEach(clase => {
                const classRange = parseTimeRange(clase.hora);
                const dayIndex = days.indexOf(clase.dia);

                if (dayIndex !== -1) {
                    // Find the row based on the class start time
                    const startTimeMinutes = classRange.start;
                    let rowIndex = -1;
                    for (let i = 0; i < timeSlots.length; i++) {
                        if (startTimeMinutes >= timeToMinutes(timeSlots[i].start) && startTimeMinutes < timeToMinutes(timeSlots[i].end)) {
                            rowIndex = i;
                            break;
                        }
                    }

                    if (rowIndex !== -1) {
                        const targetCell = scheduleBody.rows[rowIndex].cells[dayIndex + 1]; // +1 for time column

                        let timeHtml = '';
                        const startTime = clase.hora.split(' a ')[0].trim();
                        if (!standardStartTimes.includes(startTime)) {
                            timeHtml = `<p class="text-xs">${clase.hora}</p>`;
                        }

                        const blockContent = `<strong class="font-bold">${course.nombre}</strong><p class="text-xs">${section.docente}</p>${timeHtml}<p class="text-xs">Aula: ${clase.aula} (${clase.tipo})</p>`;
                        
                        // Append content to the cell, or replace if it's the first class
                        if (targetCell.innerHTML === '') {
                            targetCell.innerHTML = `<div class="class-block" style="background-color: ${color}; border-color: ${darkenColor(color, -30)};">${blockContent}</div>`;
                        } else {
                            // If there's already content, append the new block
                            targetCell.innerHTML += `<div class="class-block mt-1" style="background-color: ${color}; border-color: ${darkenColor(color, -30)};">${blockContent}</div>`;
                        }
                    }
                }
            });
        });
    }, 0);
}

        function editSchedule(scheduleId) {
    const savedSchedules = JSON.parse(localStorage.getItem('savedSchedules')) || [];
    const scheduleToEdit = savedSchedules.find(s => s.id === scheduleId);

    if (scheduleToEdit) {
        // Marcar los radio buttons correspondientes
        document.querySelectorAll('input[type="radio"]').forEach(radio => radio.checked = false);
        scheduleToEdit.courses.forEach(course => {
            const radio = document.querySelector(`input[name="course-${course.curso.codigo}"][value="${course.seccion.id}"]`);
            if (radio) {
                radio.checked = true;
            }
        });

        selectedCourses = scheduleToEdit.courses;
        updateUI();
    }
}

        function renderSelectedCourses() {
            let totalCredits = 0;
            if (selectedCourses.length === 0) {
                selectedCoursesList.innerHTML = '<p class="text-gray-500">Aún no has seleccionado ningún curso.</p>';
            } else {
                selectedCoursesList.innerHTML = selectedCourses.map(selected => {
                    const course = selected.curso;
                    const section = selected.seccion;
                    totalCredits += course.creditos;
                    return `
                        <div class="flex justify-between items-center p-2 rounded-md" style="background-color: ${courseColorMap[course.codigo]}40;">
                            <div>
                                <p class="font-bold">${course.nombre}</p>
                                <p class="text-sm text-gray-700">Sección ${section.id} - ${course.creditos} créditos</p>
                            </div>
                            <button onclick="removeCourse('${course.codigo}')" class="text-red-500 hover:text-red-700 font-bold text-2xl leading-none p-1">&times;</button>
                        </div>
                    `;
                }).join('');
            }
            creditCountSpan.textContent = totalCredits;
        }
        
        function darkenColor(hex, amount) {
            let usePound = false;
            if (hex[0] == "#") {
                hex = hex.slice(1);
                usePound = true;
            }
            let num = parseInt(hex, 16);
            let r = (num >> 16) + amount;
            if (r > 255) r = 255; else if (r < 0) r = 0;
            let g = ((num >> 8) & 0x00FF) + amount;
            if (g > 255) g = 255; else if (g < 0) g = 0;
            let b = (num & 0x0000FF) + amount;
            if (b > 255) b = 255; else if (b < 0) b = 0;
            return (usePound ? "#" : "") + (g | (b << 8) | (r << 16)).toString(16).padStart(6, '0');
        }

        function updateUI() {
            renderSchedule();
            renderSelectedCourses();
        }

        function toggleCycle(headerElement) {
            const content = headerElement.nextElementSibling;
            const svg = headerElement.querySelector('svg');
            content.classList.toggle('hidden');
            svg.style.transform = content.classList.contains('hidden') ? 'rotate(0deg)' : 'rotate(180deg)';
        }

        function romanToInt(s) {
            const map = { 'I': 1, 'V': 5, 'X': 10 };
            let result = 0;
            for (let i = 0; i < s.length; i++) {
                const current = map[s[i]];
                const next = map[s[i + 1]];
                if (next > current) {
                    result += next - current;
                    i++;
                } else {
                    result += current;
                }
            }
            return result;
        }

        downloadPngBtn.addEventListener('click', () => {
            const downloadContainer = document.createElement('div');
            downloadContainer.style.width = '1123px';
            downloadContainer.style.padding = '20px';
            downloadContainer.style.backgroundColor = 'white';

            const header = document.querySelector('header').cloneNode(true);
            const scheduleContainer = document.getElementById('schedule-container').cloneNode(true);
            const buttons = scheduleContainer.querySelector('.flex.gap-2');
            if (buttons) {
                buttons.remove();
            }

            downloadContainer.appendChild(header);
            downloadContainer.appendChild(scheduleContainer);
            document.body.appendChild(downloadContainer);

            html2canvas(downloadContainer, {
                scale: 2,
                backgroundColor: '#ffffff'
            }).then(canvas => {
                const link = document.createElement('a');
                link.download = 'programacion-horaria-2025-B.png';
                link.href = canvas.toDataURL('image/png');
                link.click();
            }).catch(err => {
                console.error('Error al generar PNG:', err);
            }).finally(() => {
                document.body.removeChild(downloadContainer);
            });
        });

        downloadPdfBtn.addEventListener('click', () => {
            const downloadContainer = document.createElement('div');
            downloadContainer.style.width = '1123px';
            downloadContainer.style.padding = '20px';
            downloadContainer.style.backgroundColor = 'white';

            const header = document.querySelector('header').cloneNode(true);
            const scheduleContainer = document.getElementById('schedule-container').cloneNode(true);
            const buttons = scheduleContainer.querySelector('.flex.gap-2');
            if (buttons) {
                buttons.remove();
            }

            downloadContainer.appendChild(header);
            downloadContainer.appendChild(scheduleContainer);
            document.body.appendChild(downloadContainer);

            html2canvas(downloadContainer, {
                scale: 3, // Aumentar la escala para mayor calidad
                backgroundColor: '#ffffff'
            }).then(canvas => {
                const imgData = canvas.toDataURL('image/png');
                const { jsPDF } = window.jspdf;
                const pdf = new jsPDF({
                    orientation: 'landscape',
                    unit: 'px',
                    format: [canvas.width, canvas.height]
                });
                pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
                pdf.save('programacion-horaria-2025-B.pdf');
            }).catch(err => {
                console.error('Error al generar PDF:', err);
            }).finally(() => {
                document.body.removeChild(downloadContainer);
            });
        });

        downloadExcelBtn.addEventListener('click', () => {
            const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
            const header = ['Hora', ...days];
            const data = [header];

            const scheduleRows = document.getElementById('schedule-body').rows;
            for (const row of scheduleRows) {
                const time = row.cells[0].textContent;
                const rowData = [time];
                for (let i = 1; i < row.cells.length; i++) {
                    const cell = row.cells[i];
                    const blocks = cell.querySelectorAll('.class-block');
                    if (blocks.length > 0) {
                        const cellContent = Array.from(blocks).map(block => {
                            const courseName = block.querySelector('strong').textContent;
                            const teacher = block.querySelectorAll('p')[0].textContent;
                            const room = block.querySelectorAll('p')[1].textContent;
                            return `${courseName}\n${teacher}\n${room}`;
                        }).join('\n\n');
                        rowData.push(cellContent);
                    } else {
                        rowData.push('');
                    }
                }
                data.push(rowData);
            }

            const ws = XLSX.utils.aoa_to_sheet(data);
            const colWidths = [{wch:10}, {wch:30}, {wch:30}, {wch:30}, {wch:30}, {wch:30}, {wch:30}];
            ws['!cols'] = colWidths;

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Horario');
            XLSX.writeFile(wb, 'programacion-horaria-2025-B.xlsx');
        });

        function saveSchedule() {
    const scheduleName = prompt("Ingresa un nombre para guardar el horario:");
    if (!scheduleName) return;

    const savedSchedules = JSON.parse(localStorage.getItem('savedSchedules')) || [];
    const newSavedSchedule = {
        id: Date.now(),
        name: scheduleName,
        courses: selectedCourses
    };

    savedSchedules.push(newSavedSchedule);
    localStorage.setItem('savedSchedules', JSON.stringify(savedSchedules));
    renderSavedSchedules();
}

function loadSchedules() {
    renderSavedSchedules();
}

function renderSavedSchedules() {
    const savedSchedules = JSON.parse(localStorage.getItem('savedSchedules')) || [];
    const savedSchedulesList = document.getElementById('saved-schedules-list');

    if (savedSchedules.length === 0) {
        savedSchedulesList.innerHTML = '<p class="text-gray-500 col-span-full">Aún no has guardado ningún horario.</p>';
        return;
    }

    savedSchedulesList.innerHTML = savedSchedules.map(schedule => `
        <div class="bg-white p-4 rounded-lg shadow-md flex justify-between items-center">
            <p class="font-semibold">${schedule.name}</p>
            <div class="flex gap-2">
                <button onclick="editSchedule(${schedule.id})" class="text-blue-600 hover:text-blue-800">Editar</button>
                <button onclick="deleteSchedule(${schedule.id})" class="text-red-600 hover:text-red-800">Eliminar</button>
                <div class="relative inline-block text-left">
                    <button onclick="this.nextElementSibling.classList.toggle('hidden')" class="inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                        Descargar
                        <svg class="-mr-1 ml-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                        </svg>
                    </button>
                    <div class="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 hidden">
                        <div class="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                            <a href="#" onclick="downloadSavedSchedule(${schedule.id}, 'png')" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" role="menuitem">PNG</a>
                            <a href="#" onclick="downloadSavedSchedule(${schedule.id}, 'pdf')" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" role="menuitem">PDF</a>
                            <a href="#" onclick="downloadSavedSchedule(${schedule.id}, 'excel')" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" role="menuitem">Excel</a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function editSchedule(scheduleId) {
    const savedSchedules = JSON.parse(localStorage.getItem('savedSchedules')) || [];
    const scheduleToEdit = savedSchedules.find(s => s.id === scheduleId);

    if (scheduleToEdit) {
        selectedCourses = scheduleToEdit.courses;
        updateUI();
        // Marcar los radio buttons correspondientes
        document.querySelectorAll('input[type="radio"]').forEach(radio => radio.checked = false);
        selectedCourses.forEach(course => {
            const radio = document.querySelector(`input[name="course-${course.curso.codigo}"][value="${course.seccion.id}"]`);
            if (radio) {
                radio.checked = true;
            }
        });
    }
}

function deleteSchedule(scheduleId) {
    let savedSchedules = JSON.parse(localStorage.getItem('savedSchedules')) || [];
    savedSchedules = savedSchedules.filter(s => s.id !== scheduleId);
    localStorage.setItem('savedSchedules', JSON.stringify(savedSchedules));
    renderSavedSchedules();
}

function downloadSavedSchedule(scheduleId, format) {
    const savedSchedules = JSON.parse(localStorage.getItem('savedSchedules')) || [];
    const scheduleToDownload = savedSchedules.find(s => s.id === scheduleId);

    if (scheduleToDownload) {
        const tempSelectedCourses = selectedCourses;
        selectedCourses = scheduleToDownload.courses;
        updateUI(); // Actualizar el horario visualmente para la descarga

        // Simular el clic en el botón de descarga correspondiente
        if (format === 'png') {
            downloadPngBtn.click();
        } else if (format === 'pdf') {
            downloadPdfBtn.click();
        } else if (format === 'excel') {
            downloadExcelBtn.click();
        }

        // Restaurar el horario original
        selectedCourses = tempSelectedCourses;
        updateUI();
    }
}

let conflictToResolve = null; // Para manejar el estado del conflicto

document.addEventListener('DOMContentLoaded', () => {
    renderCourseList();
    updateUI();
    loadSchedules();

    const replaceCourseBtn = document.getElementById('replace-course-btn');
    const cancelConflictBtn = document.getElementById('cancel-conflict-btn');

    saveScheduleBtn.addEventListener('click', saveSchedule);
    clearScheduleBtn.addEventListener('click', clearSchedule); // Add event listener for clear button

    // Event listener for replacing a course after conflict
    replaceCourseBtn.addEventListener('click', () => {
        if (conflictToResolve) {
            const { newCourse, conflicting } = conflictToResolve;
            // Remove the conflicting course first
            selectedCourses = selectedCourses.filter(c => c.curso.codigo !== conflicting.curso.codigo);
            // Then add the new course
            addCourse(newCourse);
            closeModal();
        }
    });

    // Event listener for cancelling the action
    cancelConflictBtn.addEventListener('click', () => {
        if (conflictToResolve) {
            // Uncheck the radio button that triggered the conflict
            const { newCourse } = conflictToResolve;
            const radioToUncheck = document.querySelector(`input[name="course-${newCourse.curso.codigo}"]:checked`);
            if (radioToUncheck) {
                radioToUncheck.checked = false;
            }
            closeModal();
        }
    });
});

// Modified editSchedule function
function editSchedule(scheduleId) {
    const savedSchedules = JSON.parse(localStorage.getItem('savedSchedules')) || [];
    const scheduleToEdit = savedSchedules.find(s => s.id === scheduleId);

    if (scheduleToEdit) {
        selectedCourses = scheduleToEdit.courses;
        updateUI();
        renderCourseList(); // Re-render course list to update radio buttons

        // Uncheck all radio buttons first
        document.querySelectorAll('input[type="radio"]').forEach(radio => radio.checked = false);

        // Check the radio buttons for the loaded courses and expand their cycles
        selectedCourses.forEach(course => {
            const radio = document.querySelector(`input[name="course-${course.curso.codigo}"][value="${course.seccion.id}"]`);
            if (radio) {
                radio.checked = true;

                // Expand the cycle if it's hidden
                const cycleCoursesDiv = radio.closest('.cycle-courses');
                if (cycleCoursesDiv && cycleCoursesDiv.classList.contains('hidden')) {
                    const cycleHeader = cycleCoursesDiv.previousElementSibling;
                    if (cycleHeader) {
                        toggleCycle(cycleHeader);
                    }
                }
            }
        });
    }
}
