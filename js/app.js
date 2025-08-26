// --- LÓGICA DE LA APLICACIÓN ---

let selectedCourses = [];
const colors = ['#a7f3d0', '#bae6fd', '#fef08a', '#fecaca', '#e9d5ff', '#fed7aa', '#d1fae5', '#cffafe', '#fde68a', '#fee2e2'];
let courseColorMap = {};
let colorIndex = 0;
let conflictToResolve = null;

// --- ELEMENTOS DEL DOM ---
const courseListContainer = document.getElementById('course-list');
const scheduleBody = document.getElementById('schedule-body');
const selectedCoursesList = document.getElementById('selected-courses-list');
const conflictModal = document.getElementById('conflict-modal');
const modalContent = document.getElementById('modal-content');
const conflictMessage = document.getElementById('conflict-message');
const creditCountBadge = document.getElementById('credit-count-badge');
const downloadPngBtn = document.getElementById('download-png-btn');
const downloadPdfBtn = document.getElementById('download-pdf-btn');
const downloadExcelBtn = document.getElementById('download-excel-btn');
const saveScheduleBtn = document.getElementById('save-schedule-btn');
const clearScheduleBtn = document.getElementById('clear-schedule-btn');
const cycleFilterSelect = document.getElementById('cycle-filter');
const downloadMenuBtn = document.getElementById('download-menu-btn');
const downloadMenu = document.getElementById('download-menu');

// --- LÓGICA DE MANEJO DE DATOS ---

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
                    return selected;
                }
            }
        }
    }
    return null;
}

function selectSection(courseCode, sectionId) {
    const course = coursesData.find(c => c.codigo === courseCode);
    const section = course.secciones.find(s => s.id === sectionId);
    const newCourseData = { curso: course, seccion: section };

    for (const clase of section.clases) {
        const conflictingCourse = getConflict(clase);
        if (conflictingCourse) {
            conflictToResolve = { newCourse: newCourseData, conflicting: conflictingCourse };
            const message = `El curso ${course.nombre} (Sec ${section.id}) se cruza con ${conflictingCourse.curso.nombre} (Sec ${conflictingCourse.seccion.id}). ¿Deseas reemplazarlo?`;
            showConflictModal(message);
            return;
        }
    }
    addCourse(newCourseData);
}

function addCourse(courseData) {
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
    showNotification('¡Horario limpiado exitosamente!', 'error');
}

// --- RENDERIZADO Y UI ---

function renderCourseList() {
    const selectedCycle = cycleFilterSelect.value;

    let filteredCourses = coursesData;

    if (selectedCycle) {
        filteredCourses = filteredCourses.filter(course => course.ciclo === selectedCycle);
    }

    const coursesByCycle = filteredCourses.reduce((acc, course) => {
        const cycleKey = course.ciclo;
        if (!acc[cycleKey]) acc[cycleKey] = [];
        acc[cycleKey].push(course);
        return acc;
    }, {});

    courseListContainer.innerHTML = Object.keys(coursesByCycle).sort((a, b) => romanToInt(a) - romanToInt(b)).map(ciclo => {
        const coursesHTML = coursesByCycle[ciclo].map(course => {
            const sectionsHTML = course.secciones.map(section => `
                <label class="flex items-start p-3 rounded-xl hover:bg-blue-50 cursor-pointer transition">
                    <input type="radio" name="course-${course.codigo}" value="${section.id}" class="mt-1 form-radio h-5 w-5 text-blue-600" onchange="selectSection('${course.codigo}', '${section.id}')">
                    <div class="ml-3 text-sm">
                        <p class="font-semibold text-gray-800">Sección ${section.id}</p>
                        <p class="text-gray-600">${section.docente}</p>
                        <div class="text-xs text-gray-500 mt-1 space-y-1">
                            ${section.clases.map(c => `<span>${c.dia}: ${c.hora} (${c.aula})</span>`).join('<br>')}
                        </div>
                    </div>
                </label>
            `).join('');

            return `
                <div class="border border-gray-200 bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition">
                    <p class="font-bold text-gray-900">${course.nombre}</p>
                    <p class="text-xs text-gray-500 mb-3">Código: ${course.codigo} | Créditos: ${course.creditos}</p>
                    <div class="space-y-2">${sectionsHTML}</div>
                </div>
            `;
        }).join('');

        return `
            <div class="rounded-xl overflow-hidden border border-gray-200">
                <div class="cycle-header bg-gray-50 p-3 flex justify-between items-center cursor-pointer" onclick="toggleCycle(this)">
                    <h3 class="text-lg font-bold text-blue-800">CICLO ${ciclo}</h3>
                    <svg class="h-6 w-6 text-blue-800 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
                </div>
                <div class="cycle-courses p-2 space-y-3 hidden bg-white">
                    ${coursesHTML}
                </div>
            </div>
        `;
    }).join('');
}

function populateCycleFilter() {
    const cycles = [...new Set(coursesData.map(course => course.ciclo))].sort((a, b) => romanToInt(a) - romanToInt(b));
    cycles.forEach(cycle => {
        const option = document.createElement('option');
        option.value = cycle;
        option.textContent = `Ciclo ${cycle}`;
        cycleFilterSelect.appendChild(option);
    });
}

function renderSchedule() {
    const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const pixelsPerMinute = 0.8;
    const scheduleStartHour = 8;
    const scheduleEndHour = 23;

    scheduleBody.innerHTML = '';

    for (let hour = scheduleStartHour; hour < scheduleEndHour; hour++) {
        const row = document.createElement('tr');
        const timeCell = document.createElement('td');
        timeCell.className = 'border-b border-gray-200 p-2 font-medium text-xs text-gray-600 sticky left-0 bg-white';
        
        let rowHeight = 60;
        if (hour === scheduleEndHour - 1) { // Last hour
            rowHeight = 70; // 60 minutes + 10 minutes to show up to 22:10
        }
        timeCell.style.height = `${rowHeight * pixelsPerMinute}px`;
        timeCell.textContent = `${String(hour).padStart(2, '0')}:00`;
        row.appendChild(timeCell);

        days.forEach(() => {
            const cell = document.createElement('td');
            cell.className = 'border-b border-l border-gray-200 schedule-cell';
            row.appendChild(cell);
        });
        scheduleBody.appendChild(row);
    }

    setTimeout(() => {
        const classesToRender = [];
        const classesByDayAndCourseSection = {};

        selectedCourses.forEach(selected => {
            const course = selected.curso;
            const section = selected.seccion;
            const color = courseColorMap[course.codigo];

            section.clases.forEach(clase => {
                const key = `${clase.dia}-${course.codigo}-${section.id}`;
                if (!classesByDayAndCourseSection[key]) {
                    classesByDayAndCourseSection[key] = [];
                }
                classesByDayAndCourseSection[key].push({ ...clase, courseName: course.nombre, docente: section.docente, color: color });
            });
        });

        for (const key in classesByDayAndCourseSection) {
            const dayCourseSectionClasses = classesByDayAndCourseSection[key].sort((a, b) => timeToMinutes(a.hora.split(' a ')[0]) - timeToMinutes(b.hora.split(' a ')[0]));
            let i = 0;
            while (i < dayCourseSectionClasses.length) {
                let currentClass = dayCourseSectionClasses[i];
                let mergedClass = { ...currentClass };
                let j = i + 1;
                while (j < dayCourseSectionClasses.length) {
                    let nextClass = dayCourseSectionClasses[j];
                    const currentEnd = parseTimeRange(mergedClass.hora).end;
                    const nextStart = parseTimeRange(nextClass.hora).start;
                    if (currentEnd === nextStart && mergedClass.docente === nextClass.docente && mergedClass.aula === nextClass.aula) {
                        mergedClass.hora = `${mergedClass.hora.split(' a ')[0]} a ${nextClass.hora.split(' a ')[1]}`;
                        j++;
                    } else {
                        break;
                    }
                }
                classesToRender.push(mergedClass);
                i = j;
            }
        }

        classesToRender.forEach(clase => {
            const classRange = parseTimeRange(clase.hora);
            const dayIndex = days.indexOf(clase.dia);

            if (dayIndex !== -1) {
                const topOffset = (classRange.start - (scheduleStartHour * 60)) * pixelsPerMinute;
                const blockHeight = (classRange.end - classRange.start) * pixelsPerMinute;

                const targetCell = scheduleBody.rows[0].cells[dayIndex + 1];

                const blockContent = `<div class="content-wrapper"><strong class="font-bold">${clase.courseName}</strong><p class="text-xs">${clase.docente}</p><p class="text-xs">${clase.hora}</p><p class="text-xs">Aula: ${clase.aula} (${clase.tipo})</p></div>`;
                
                const blockDiv = document.createElement('div');
                blockDiv.className = 'class-block absolute';
                if (blockHeight < 80) {
                    blockDiv.classList.add('small-block');
                }
                blockDiv.style.top = `${topOffset}px`;
                blockDiv.style.height = `${blockHeight}px`;
                blockDiv.style.width = '100%';
                blockDiv.style.left = '0';
                blockDiv.style.backgroundColor = clase.color;
                blockDiv.style.borderColor = darkenColor(clase.color, -30);
                blockDiv.innerHTML = blockContent;

                targetCell.appendChild(blockDiv);
            }
        });
    }, 0);
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
            const color = courseColorMap[course.codigo] || '#e5e7eb';
            return `
                <div class="flex items-center gap-3 p-2 rounded-full text-sm font-semibold" style="background-color: ${color}60; border-left: 4px solid ${color};">
                    <span class="flex-grow">${course.nombre} (Sec ${section.id})</span>
                    <button onclick="removeCourse('${course.codigo}')" class="text-red-500 hover:text-red-700 font-bold text-lg leading-none rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-100 transition">&times;</button>
                </div>
            `;
        }).join('');
    }
    creditCountBadge.textContent = `${totalCredits} créditos`;
}

async function saveSchedule() {
    const scheduleName = prompt("Ingresa un nombre para guardar el horario:");
    if (!scheduleName) return;

    const scheduleContainer = document.getElementById('schedule-container');
    const canvas = await html2canvas(scheduleContainer, { scale: 1, backgroundColor: '#ffffff' });
    const thumbnail = canvas.toDataURL('image/png', 0.5);

    const savedSchedules = JSON.parse(localStorage.getItem('savedSchedules')) || [];
    const newSavedSchedule = {
        id: Date.now(),
        name: scheduleName,
        courses: selectedCourses,
        thumbnail: thumbnail
    };

    savedSchedules.push(newSavedSchedule);
    localStorage.setItem('savedSchedules', JSON.stringify(savedSchedules));
    renderSavedSchedules();
    showNotification('¡Horario guardado exitosamente!');
}

function renderSavedSchedules() {
    const savedSchedules = JSON.parse(localStorage.getItem('savedSchedules')) || [];
    const savedSchedulesList = document.getElementById('saved-schedules-list');

    if (savedSchedules.length === 0) {
        savedSchedulesList.innerHTML = '<p class="text-gray-500 col-span-full text-center">Aún no has guardado ningún horario.</p>';
        return;
    }

    savedSchedulesList.innerHTML = savedSchedules.map(schedule => `
        <div class="bg-white p-4 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
            <p class="font-bold text-lg text-blue-800 truncate mb-2">${schedule.name}</p>
            <img src="${schedule.thumbnail}" alt="Miniatura del horario" class="rounded-md border border-gray-200 mb-4 w-full h-auto">
            <div class="flex justify-between gap-2">
                <button onclick="editSchedule(${schedule.id})" class="w-full px-3 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition">Editar</button>
                <button onclick="deleteSchedule(${schedule.id})" class="w-full px-3 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition">Eliminar</button>
            </div>
        </div>
    `).join('');
}

function loadSchedules() {
    renderSavedSchedules();
}

function updateUI() {
    renderSchedule();
    renderSelectedCourses();
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

function toggleCycle(headerElement) {
    const content = headerElement.nextElementSibling;
    const svg = headerElement.querySelector('svg');
    content.classList.toggle('hidden');
    svg.style.transform = content.classList.contains('hidden') ? 'rotate(0deg)' : 'rotate(-180deg)';
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
    return (usePound ? "#" : "") + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

function deleteSchedule(scheduleId) {
    let savedSchedules = JSON.parse(localStorage.getItem('savedSchedules')) || [];
    savedSchedules = savedSchedules.filter(s => s.id !== scheduleId);
    localStorage.setItem('savedSchedules', JSON.stringify(savedSchedules));
    renderSavedSchedules();
    showNotification('¡Horario eliminado exitosamente!', 'error');
}

function editSchedule(scheduleId) {
    const savedSchedules = JSON.parse(localStorage.getItem('savedSchedules')) || [];
    const scheduleToEdit = savedSchedules.find(s => s.id === scheduleId);

    if (scheduleToEdit) {
        selectedCourses = scheduleToEdit.courses;
        updateUI();
        renderCourseList();

        document.querySelectorAll('input[type="radio"]').forEach(radio => radio.checked = false);

        selectedCourses.forEach(course => {
            const radio = document.querySelector(`input[name="course-${course.curso.codigo}"][value="${course.seccion.id}"]`);
            if (radio) {
                radio.checked = true;

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

async function downloadSchedule(format) {
    const studentName = prompt("Ingresa tu nombre para el horario (opcional):");

    const printContainer = document.createElement('div');
    printContainer.style.position = 'absolute';
    printContainer.style.left = '-9999px';
    printContainer.style.top = '-9999px';
    printContainer.style.width = '1600px';
    printContainer.style.padding = '20px';
    printContainer.style.backgroundColor = 'white';

    const header = document.querySelector('header').cloneNode(true);
    const scheduleContainer = document.getElementById('schedule-container').cloneNode(true);

    const scheduleTitle = scheduleContainer.querySelector('h2');
    if (scheduleTitle) {
        scheduleTitle.remove();
    }

    const buttons = scheduleContainer.querySelector('.flex.flex-wrap.gap-2');
    if (buttons) {
        buttons.remove();
    }

    printContainer.appendChild(header);

    if (studentName) {
        const nameTitle = document.createElement('h3');
        nameTitle.className = 'text-2xl font-bold text-center my-4';
        nameTitle.textContent = studentName;
        printContainer.appendChild(nameTitle);
    }

    printContainer.appendChild(scheduleContainer);
    document.body.appendChild(printContainer);

    await new Promise(resolve => setTimeout(resolve, 100));

    try {
        const canvas = await html2canvas(printContainer, {
            scale: 2,
            backgroundColor: '#ffffff'
        });

        if (format === 'png') {
            const link = document.createElement('a');
            link.download = `horario-${studentName || '2025-B'}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            showNotification('¡PNG descargado exitosamente!');
        } else if (format === 'pdf') {
            const imgData = canvas.toDataURL('image/png');
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'px',
                format: [canvas.width, canvas.height]
            });
            pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
            pdf.save(`horario-${studentName || '2025-B'}.pdf`);
            showNotification('¡PDF descargado exitosamente!');
        }
    } catch (err) {
        console.error(`Error al generar ${format.toUpperCase()}:`, err);
    } finally {
        document.body.removeChild(printContainer);
    }
}

// --- LÓGICA DE NOTIFICACIONES ---

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('show');
    }, 10);

    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// --- MANEJO DE EVENTOS ---
document.addEventListener('DOMContentLoaded', () => {
    populateCycleFilter();
    renderCourseList();
    updateUI();
    loadSchedules();

    cycleFilterSelect.addEventListener('change', renderCourseList);
    saveScheduleBtn.addEventListener('click', saveSchedule);
    clearScheduleBtn.addEventListener('click', clearSchedule);

    downloadPngBtn.addEventListener('click', () => downloadSchedule('png'));
    downloadPdfBtn.addEventListener('click', () => downloadSchedule('pdf'));

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
        showNotification('¡Excel descargado exitosamente!');
    });

    downloadMenuBtn.addEventListener('click', () => {
        downloadMenu.classList.toggle('hidden');
    });

    document.getElementById('download-png-menu').addEventListener('click', (e) => { e.preventDefault(); downloadPngBtn.click(); downloadMenu.classList.add('hidden'); });
    document.getElementById('download-pdf-menu').addEventListener('click', (e) => { e.preventDefault(); downloadPdfBtn.click(); downloadMenu.classList.add('hidden'); });
    document.getElementById('download-excel-menu').addEventListener('click', (e) => { e.preventDefault(); downloadExcelBtn.click(); downloadMenu.classList.add('hidden'); });

    const replaceCourseBtn = document.getElementById('replace-course-btn');
    const cancelConflictBtn = document.getElementById('cancel-conflict-btn');

    replaceCourseBtn.addEventListener('click', () => {
        if (conflictToResolve) {
            const { newCourse, conflicting } = conflictToResolve;
            removeCourse(conflicting.curso.codigo);
            addCourse(newCourse);
            closeModal();
        }
    });

    cancelConflictBtn.addEventListener('click', () => {
        if (conflictToResolve) {
            const { newCourse } = conflictToResolve;
            const radioToUncheck = document.querySelector(`input[name="course-${newCourse.curso.codigo}"]:checked`);
            if (radioToUncheck) radioToUncheck.checked = false;
            closeModal();
        }
    });
});
