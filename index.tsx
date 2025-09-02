/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// --- Type Definitions ---
interface FieldData {
    [key: string]: { ts: number }[];
}

interface StudentData {
    name: string;
    fields: FieldData[];
}

interface ClassStudents {
    [studentId: string]: StudentData;
}

interface ClassData {
    id: number;
    name: string;
    students: ClassStudents;
    sessionDates: string[];
}

interface AppState {
    classes: ClassData[];
    activeClassId: number;
    fieldCount: number;
}

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element Selection ---
    const tableBody = document.querySelector('#students-table tbody');
    const exportCsvBtn = document.getElementById('export-csv-btn');
    const clearDataBtn = document.getElementById('clear-data-btn');
    const addStudentBtn = document.getElementById('add-student-btn');
    const importStudentsBtn = document.getElementById('import-students-btn');
    const increaseFieldsBtn = document.getElementById('increase-fields-btn');
    const classTabsContainer = document.querySelector('.class-tabs-container');
    const importDataBtn = document.getElementById('import-data-btn');
    const exportDataBtn = document.getElementById('export-data-btn');
    const shareAppBtn = document.getElementById('share-app-btn');
    const openInNewWindowBtn = document.getElementById('open-in-new-window-btn');
    const importFileInput = document.getElementById('import-file-input') as HTMLInputElement;
    const printTableBtn = document.getElementById('print-table-btn');

    // Delete Modal elements
    const deleteModal = document.getElementById('delete-confirm-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalText = document.getElementById('modal-text');
    const modalConfirmBtn = document.getElementById('modal-confirm-btn');
    const modalCancelBtn = document.getElementById('modal-cancel-btn');

    // Import Modal elements
    const importModal = document.getElementById('import-students-modal');
    const pasteArea = document.getElementById('students-paste-area') as HTMLTextAreaElement;
    const importConfirmBtn = document.getElementById('modal-import-confirm-btn');
    const importCancelBtn = document.getElementById('modal-import-cancel-btn');

    // Report Modal elements
    const reportModal = document.getElementById('report-modal');
    const reportStudentName = document.getElementById('report-student-name');
    const reportClassName = document.getElementById('report-class-name');
    const reportDate = document.getElementById('report-date');
    const reportMusharaka = document.getElementById('report-musharaka');
    const reportWajibat = document.getElementById('report-wajibat');
    const reportBuhuth = document.getElementById('report-buhuth');
    const reportPositivePoints = document.getElementById('report-positive-points');
    const reportTaakhur = document.getElementById('report-taakhur');
    const reportNawm = document.getElementById('report-nawm');
    const reportJawwal = document.getElementById('report-jawwal');
    const reportNegativePoints = document.getElementById('report-negative-points');
    const reportFinalPoints = document.getElementById('report-final-points');
    const reportDetailsTbody = document.getElementById('report-details-tbody');
    const reportCloseBtn = document.getElementById('modal-report-close-btn');
    const reportPrintBtn = document.getElementById('modal-report-print-btn');

    if (!tableBody || !exportCsvBtn || !clearDataBtn || !addStudentBtn || !classTabsContainer || !deleteModal || !modalTitle || !modalText || !modalConfirmBtn || !modalCancelBtn || !importStudentsBtn || !importModal || !pasteArea || !importConfirmBtn || !importCancelBtn || !importDataBtn || !exportDataBtn || !importFileInput || !increaseFieldsBtn || !shareAppBtn || !openInNewWindowBtn || !reportModal || !reportStudentName || !reportClassName || !reportDate || !reportMusharaka || !reportWajibat || !reportBuhuth || !reportPositivePoints || !reportTaakhur || !reportNawm || !reportJawwal || !reportNegativePoints || !reportFinalPoints || !reportDetailsTbody || !reportCloseBtn || !reportPrintBtn || !printTableBtn) {
        console.error('Essential element not found!');
        return;
    }

    // --- Constants and Global Variables ---
    const attendanceStates = {
        'حاضر': 'hadir',
        'غائب': 'ghaib'
    };

    const taskStates = {
        'بحوث': 'buhuth',
        'واجبات': 'wajibat'
    };
    
    const behavioralStates = {
        'مشاركة': 'musharaka',
        'نوم': 'nawm',
        'تأخر': 'taakhur',
        'جوال': 'jawwal'
    };

    const stateShorts: { [key: string]: string } = {
        hadir: 'ح',
        ghaib: 'غ',
        buhuth: 'ب',
        wajibat: 'و',
        musharaka: 'ش',
        nawm: 'ن',
        taakhur: 'ت',
        jawwal: 'ج'
    };
    
    const ALL_STATE_KEYS = [...Object.values(attendanceStates), ...Object.values(taskStates), ...Object.values(behavioralStates)];

    const DISPLAY_ORDER = [
        behavioralStates['مشاركة'],
        taskStates['واجبات'],
        taskStates['بحوث'],
        behavioralStates['تأخر'],
        behavioralStates['نوم'],
        behavioralStates['جوال'],
    ];

    const storageKey = 'studentTrackerData_v2';
    let appState: AppState;
    let activeCellButton: HTMLButtonElement | null = null;
    let popover = createPopover();
    let deletionCallback: (() => void) | null = null;
    document.body.appendChild(popover);

    // --- Utility Functions ---
    const getTodayDateString = (): string => {
        const today = new Date();
        const day = String(today.getDate()).padStart(2, '0');
        const month = String(today.getMonth() + 1).padStart(2, '0');
        return `${day}/${month}`;
    };

    const getActiveClass = (): ClassData | undefined => {
        return appState.classes.find(c => c.id === appState.activeClassId);
    }
    
    const createEmptyField = (): FieldData => {
        const fieldData: FieldData = {};
        ALL_STATE_KEYS.forEach(key => {
            fieldData[key] = [];
        });
        return fieldData;
    };

    const createNewStudent = (name: string): StudentData => {
        const fields: FieldData[] = Array.from({ length: appState.fieldCount }, createEmptyField);
        return { name, fields };
    };

    const createNewClass = (name: string, fieldCount: number): ClassData => ({
        id: Date.now(),
        name,
        students: {},
        sessionDates: Array(fieldCount).fill('')
    });
    
    const getShareableUrl = (): string => {
        return window.location.href;
    };

    // --- State Management ---
    function saveState() {
        localStorage.setItem(storageKey, JSON.stringify(appState));
    }

    function loadAndInitializeState() {
        const savedState = localStorage.getItem(storageKey);
        if (savedState) {
            appState = JSON.parse(savedState);
            
            // Migration for fieldCount property
            if (typeof appState.fieldCount === 'undefined') {
                appState.fieldCount = 40;
            }

            // Migration for students and sessionDates
            appState.classes.forEach(cls => {
                // Migrate sessionDates
                if (!cls.sessionDates) {
                    cls.sessionDates = Array(appState.fieldCount).fill('');
                }
                const datesNeeded = appState.fieldCount - cls.sessionDates.length;
                if (datesNeeded > 0) {
                    for (let i = 0; i < datesNeeded; i++) {
                        cls.sessionDates.push('');
                    }
                }

                // Migrate students fields
                Object.values(cls.students).forEach(student => {
                    if(!student.fields) student.fields = [];
                    const fieldsNeeded = appState.fieldCount - student.fields.length;
                    if (fieldsNeeded > 0) {
                        for (let i = 0; i < fieldsNeeded; i++) {
                            student.fields.push(createEmptyField());
                        }
                    }
                });
            });


            // Ensure there's at least one class and an active class is set
            if (appState.classes.length === 0) {
                 const defaultClass = createNewClass('فصل أ', appState.fieldCount);
                 appState.classes.push(defaultClass);
                 appState.activeClassId = defaultClass.id;
            }
            if (!getActiveClass()) {
                appState.activeClassId = appState.classes[0]?.id;
            }
        } else {
            // Create initial state with one class and 5 students
            const fieldCount = 40;
            const defaultClass = createNewClass('فصل أ', fieldCount);
            appState = {
                classes: [defaultClass],
                activeClassId: defaultClass.id,
                fieldCount: fieldCount
            };
            for (let i = 0; i < 5; i++) {
                defaultClass.students[`student-${i}`] = createNewStudent(`الطالب ${i + 1}`);
            }
        }
    }

    // --- Popover Logic ---
    function createPopover() {
        const popoverEl = document.createElement('div');
        popoverEl.id = 'entry-popover';
        popoverEl.className = 'popover';
    
        const attendanceGroup = document.createElement('div');
        attendanceGroup.className = 'popover-group';
        Object.entries(attendanceStates).forEach(([name, key]) => {
            const button = document.createElement('button');
            button.className = 'popover-btn';
            button.dataset.state = key;
            button.dataset.action = 'set-attendance';
            button.textContent = name;
            attendanceGroup.appendChild(button);
        });
    
        const tasksGroup = document.createElement('div');
        tasksGroup.className = 'popover-group';
        Object.entries(taskStates).forEach(([name, key]) => {
            const button = document.createElement('button');
            button.className = 'popover-btn';
            button.dataset.state = key;
            button.dataset.action = 'toggle-task';
            button.textContent = name;
            tasksGroup.appendChild(button);
        });

        // Musharaka Group (dedicated row)
        const musharakaGroup = document.createElement('div');
        musharakaGroup.className = 'popover-group';

        const musharakaContainer = document.createElement('div');
        musharakaContainer.className = 'musharaka-container';

        const musharakaName = Object.keys(behavioralStates).find(key => behavioralStates[key] === 'musharaka') || 'مشاركة';
        const label = document.createElement('span');
        label.textContent = musharakaName;
        musharakaContainer.appendChild(label);

        const counter = document.createElement('div');
        counter.className = 'popover-counter';

        const minusBtn = document.createElement('button');
        minusBtn.className = 'counter-btn';
        minusBtn.textContent = '-';
        minusBtn.dataset.action = 'decrement-musharaka';
        
        const countSpan = document.createElement('span');
        countSpan.className = 'counter-display';
        countSpan.id = 'musharaka-count-display';
        countSpan.textContent = '0';

        const plusBtn = document.createElement('button');
        plusBtn.className = 'counter-btn';
        plusBtn.textContent = '+';
        plusBtn.dataset.action = 'increment-musharaka';

        counter.appendChild(minusBtn);
        counter.appendChild(countSpan);
        counter.appendChild(plusBtn);
        musharakaContainer.appendChild(counter);
        musharakaGroup.appendChild(musharakaContainer);
        

        // Other behaviors group
        const behaviorsGroup = document.createElement('div');
        behaviorsGroup.className = 'popover-group';
        Object.entries(behavioralStates).forEach(([name, key]) => {
            if (key !== behavioralStates['مشاركة']) {
                const button = document.createElement('button');
                button.className = 'popover-btn';
                button.dataset.state = key;
                button.dataset.action = 'toggle-behavior';
                button.textContent = name;
                behaviorsGroup.appendChild(button);
            }
        });
    
        popoverEl.appendChild(attendanceGroup);
        popoverEl.appendChild(tasksGroup);
        popoverEl.appendChild(musharakaGroup);
        popoverEl.appendChild(behaviorsGroup);
    
        popoverEl.addEventListener('click', (e) => {
            e.stopPropagation();
            const target = e.target as HTMLElement;
            const activeClass = getActiveClass();
            if (!activeCellButton || !target || !activeClass) return;
            if (!target.matches('.popover-btn') && !target.matches('.counter-btn')) return;
    
            const studentId = activeCellButton.dataset.studentId;
            const fieldIndexStr = activeCellButton.dataset.fieldIndex;
            if (!studentId || fieldIndexStr === undefined) return;
            const fieldIndex = parseInt(fieldIndexStr, 10);
            const student = activeClass.students[studentId];
            if (!student) return;
    
            const action = target.dataset.action;
            if (!action) return;
    
            const field = student.fields[fieldIndex];
            const musharakaKey = behavioralStates['مشاركة'];
    
            if (action === 'set-attendance') {
                const stateKey = target.dataset.state;
                if(!stateKey) return;
                Object.values(attendanceStates).forEach(key => field[key] = []);
                field[stateKey].push({ ts: Date.now() });
                if (stateKey === attendanceStates['غائب']) {
                    Object.values(taskStates).forEach(key => field[key] = []);
                    Object.values(behavioralStates).forEach(key => field[key] = []);
                }
            } else if (action === 'toggle-task' || action === 'toggle-behavior') {
                const stateKey = target.dataset.state;
                if(!stateKey) return;
                if (field[attendanceStates['غائب']]?.length > 0) return; 
                if (field[stateKey]?.length > 0) {
                    field[stateKey] = [];
                } else {
                    field[stateKey] = [{ ts: Date.now() }];
                }
            } else if (action === 'increment-musharaka') {
                if (field[attendanceStates['غائب']]?.length > 0) return;
                if (!field[musharakaKey]) field[musharakaKey] = [];
                field[musharakaKey].push({ ts: Date.now() });
            } else if (action === 'decrement-musharaka') {
                if (field[attendanceStates['غائب']]?.length > 0) return;
                if (field[musharakaKey]?.length > 0) {
                    field[musharakaKey].pop();
                }
            }
    
            updatePopoverState(activeCellButton);
            updateButtonText(activeCellButton);
            const row = activeCellButton.closest('tr');
            if(row) calculateAndUpdatePoints(row, studentId);
            saveState();
        });
        return popoverEl;
    }
    
    function updatePopoverState(button: HTMLButtonElement) {
        const activeClass = getActiveClass();
        if(!activeClass) return;
        const studentId = button.dataset.studentId;
        const fieldIndexStr = button.dataset.fieldIndex;
        if (!studentId || fieldIndexStr === undefined) return;
        const fieldIndex = parseInt(fieldIndexStr, 10);
        const student = activeClass.students[studentId];
        if(!student) return;
        
        const fieldData = student.fields[fieldIndex];
        const isAbsent = fieldData[attendanceStates['غائب']]?.length > 0;
        const musharakaKey = behavioralStates['مشاركة'];

        // Update and manage musharaka counter
        const musharakaCount = fieldData[musharakaKey]?.length || 0;
        const countDisplay = popover.querySelector('#musharaka-count-display');
        if (countDisplay) {
            countDisplay.textContent = String(musharakaCount);
        }
        const musharakaContainer = popover.querySelector('.musharaka-container');
        if(musharakaContainer) {
            musharakaContainer.classList.toggle('active', musharakaCount > 0);
        }
        popover.querySelectorAll('.counter-btn').forEach(btnEl => {
            (btnEl as HTMLButtonElement).disabled = isAbsent;
        });

        // Handle all other toggle buttons
        popover.querySelectorAll('.popover-btn').forEach(btnEl => {
            const btn = btnEl as HTMLButtonElement;
            const stateKey = btn.dataset.state;
            if (!stateKey) return;
            
            if (fieldData[stateKey]?.length > 0) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }

            const isAttendanceButton = btn.dataset.action === 'set-attendance';
            if (isAbsent && !isAttendanceButton) {
                btn.disabled = true;
            } else {
                btn.disabled = false;
            }
        });
    }

    function showPopover(button: HTMLButtonElement) {
        activeCellButton = button;
        updatePopoverState(button);
        const rect = button.getBoundingClientRect();
        popover.style.display = 'block';
        
        // Position the popover
        const popoverHeight = popover.offsetHeight;
        const popoverWidth = popover.offsetWidth;
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;

        // Prefer to show below
        if (spaceBelow > popoverHeight || spaceBelow > spaceAbove) {
            popover.style.top = `${window.scrollY + rect.bottom + 5}px`;
        } else { // Show above if not enough space below
            popover.style.top = `${window.scrollY + rect.top - popoverHeight - 5}px`;
        }
        
        // Center horizontally
        popover.style.left = `${window.scrollX + rect.left + (rect.width / 2) - (popoverWidth / 2)}px`;

    }

    function hidePopover() {
        if (popover.style.display === 'block') {
            popover.style.display = 'none';
            activeCellButton = null;
        }
    }

    // --- Modal Logic ---
    function showDeleteModal(title: string, text: string, onConfirm: () => void) {
        modalTitle.textContent = title;
        modalText.textContent = text;
        deletionCallback = onConfirm;
        deleteModal.style.display = 'flex';
    }

    function hideDeleteModal() {
        deleteModal.style.display = 'none';
        deletionCallback = null;
    }

    function showImportModal() {
        pasteArea.value = '';
        importModal.style.display = 'flex';
    }

    function hideImportModal() {
        importModal.style.display = 'none';
    }
    
    function hideReportModal() {
        reportModal.style.display = 'none';
    }


    // --- UI Update Logic ---
    function highlightTodayColumn() {
        const todayStr = getTodayDateString();
        const table = document.getElementById('students-table');
        if (!table) return;

        // Clear previous highlighting
        table.querySelectorAll('.today-column').forEach(el => el.classList.remove('today-column'));

        const activeClass = getActiveClass();
        if (!activeClass) return;

        const indices = activeClass.sessionDates.reduce((acc, date, index) => {
            if (date === todayStr) {
                acc.push(index + 3); // CSS nth-child is 1-based. col1=name, col2=points, so session 1 is col 3.
            }
            return acc;
        }, [] as number[]);

        if (indices.length > 0) {
            const selector = indices.map(i => `th:nth-child(${i}), td:nth-child(${i})`).join(', ');
            table.querySelectorAll(selector).forEach(cell => cell.classList.add('today-column'));
        }
    }

    function updateButtonText(button: HTMLButtonElement) {
        const activeClass = getActiveClass();
        const studentId = button.dataset.studentId;
        const fieldIndexStr = button.dataset.fieldIndex;
        if (!activeClass || !studentId || fieldIndexStr === undefined || !activeClass.students[studentId]) return;

        const fieldIndex = parseInt(fieldIndexStr, 10);
        const fieldData = activeClass.students[studentId].fields[fieldIndex];
        const parts: string[] = [];

        if (fieldData[attendanceStates['غائب']]?.length > 0) {
            parts.push(stateShorts.ghaib);
        } else {
            if (fieldData[attendanceStates['حاضر']]?.length > 0) {
                parts.push(stateShorts.hadir);
            }

            DISPLAY_ORDER.forEach(key => {
                const count = fieldData[key]?.length || 0;
                if (count > 0) {
                    const short = stateShorts[key];
                    if (key === behavioralStates['مشاركة']) {
                        if (count > 1) {
                            parts.push(`${short}(${count})`);
                        } else {
                            parts.push(short);
                        }
                    } else {
                        parts.push(short);
                    }
                }
            });
        }

        const summary = parts.join(' ');
        button.textContent = summary || 'إضافة...';
        button.classList.toggle('has-data', !!summary);
        button.classList.toggle('is-absent', fieldData[attendanceStates['غائب']]?.length > 0);
    }
    
    const calculateAndUpdatePoints = (row: HTMLTableRowElement, studentId: string) => {
        const activeClass = getActiveClass();
        if (!activeClass || !activeClass.students[studentId]) return;

        let totalIntegerPoints = 0;
        const studentData = activeClass.students[studentId];

        studentData.fields.forEach(field => {
            // Tasks: +0.5 each
            totalIntegerPoints += (field[taskStates['بحوث']]?.length || 0);
            totalIntegerPoints += (field[taskStates['واجبات']]?.length || 0);
            // Behaviors
            totalIntegerPoints += (field[behavioralStates['مشاركة']]?.length || 0); // مشاركة: +0.5
            totalIntegerPoints -= (field[behavioralStates['نوم']]?.length || 0);      // نوم: -0.5
            totalIntegerPoints -= (field[behavioralStates['تأخر']]?.length || 0);     // تأخر: -0.5
            totalIntegerPoints -= (field[behavioralStates['جوال']]?.length || 0);     // جوال: -0.5
        });

        const totalPoints = totalIntegerPoints / 2;
        const pointsCell = row.querySelector('.points-cell');
        if (pointsCell) pointsCell.textContent = totalPoints.toFixed(1);
    };

    // --- Main Rendering Logic ---
    function renderAll() {
        renderTabs();
        renderTableHeader();
        renderTable();
        highlightTodayColumn();
    }

    function renderTabs() {
        classTabsContainer.innerHTML = '';
        const fragment = document.createDocumentFragment();

        appState.classes.forEach(cls => {
            const tab = document.createElement('div');
            tab.className = 'class-tab';
            tab.dataset.classId = String(cls.id);
            if(cls.id === appState.activeClassId) tab.classList.add('active');
            
            const nameSpan = document.createElement('span');
            nameSpan.className = 'class-tab-name';
            nameSpan.textContent = cls.name;
            
            tab.addEventListener('click', (e) => {
                const target = e.target as HTMLElement;
                if(target === nameSpan || target === tab) switchClass(cls.id);
            });

            nameSpan.addEventListener('dblclick', () => {
                nameSpan.contentEditable = 'true';
                nameSpan.focus();
            });

            nameSpan.addEventListener('blur', () => {
                nameSpan.contentEditable = 'false';
                const newName = nameSpan.textContent?.trim();
                if(newName && newName !== cls.name) {
                    cls.name = newName;
                    saveState();
                } else {
                    nameSpan.textContent = cls.name;
                }
            });
             nameSpan.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    nameSpan.blur();
                }
            });

            const editBtn = document.createElement('button');
            editBtn.className = 'edit-class-btn';
            editBtn.innerHTML = '&#9998;'; // Pencil icon
            editBtn.setAttribute('aria-label', `تعديل اسم فصل ${cls.name}`);
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // prevent tab switching
                nameSpan.contentEditable = 'true';
                nameSpan.focus();
                // Select all text in the span for easy replacement
                const selection = window.getSelection();
                const range = document.createRange();
                range.selectNodeContents(nameSpan);
                selection?.removeAllRanges();
                selection?.addRange(range);
            });

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-class-btn';
            deleteBtn.innerHTML = '&times;';
            deleteBtn.setAttribute('aria-label', `حذف فصل ${cls.name}`);
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                handleDeleteClass(cls.id, cls.name);
            });

            tab.appendChild(nameSpan);
            tab.appendChild(editBtn);
            tab.appendChild(deleteBtn);
            fragment.appendChild(tab);
        });

        const addBtn = document.createElement('button');
        addBtn.className = 'add-class-btn';
        addBtn.textContent = '+';
        addBtn.setAttribute('aria-label', 'إضافة فصل جديد');
        addBtn.addEventListener('click', addClass);
        
        classTabsContainer.appendChild(fragment);
        classTabsContainer.appendChild(addBtn);
    }

    function renderTableHeader() {
        const headerRow = document.getElementById('table-header-row');
        const datesRow = document.getElementById('table-dates-row');
        const activeClass = getActiveClass();
    
        if (!headerRow || !datesRow || !activeClass) return;
    
        headerRow.innerHTML = '';
        datesRow.innerHTML = '';
    
        // Top row (dates) placeholders for Name and Points columns
        datesRow.appendChild(document.createElement('th'));
        datesRow.appendChild(document.createElement('th'));
    
        // Bottom row (headers) for Name and Points
        const nameTh = document.createElement('th');
        nameTh.textContent = 'اسم الطالب';
        headerRow.appendChild(nameTh);
    
        const pointsTh = document.createElement('th');
        pointsTh.textContent = 'مجموع النقاط';
        headerRow.appendChild(pointsTh);
    
        // Generate date options once to improve performance
        const dateOptions: { label: string; options: string[] }[] = [];
        for (let month = 1; month <= 12; month++) {
            const daysInMonth = new Date(2024, month, 0).getDate(); // Use a leap year for safety
            const options: string[] = [];
            for (let day = 1; day <= daysInMonth; day++) {
                options.push(`${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}`);
            }
            dateOptions.push({ label: `شهر ${month}`, options });
        }
    
        const dateThFragment = document.createDocumentFragment();
        const sessionThFragment = document.createDocumentFragment();
    
        for (let i = 0; i < appState.fieldCount; i++) {
            // Add date select cell to the top row
            const dateTh = document.createElement('th');
            const dateSelect = document.createElement('select');
            dateSelect.className = 'date-select';
            dateSelect.setAttribute('aria-label', `تاريخ الحصة ${i + 1}`);
            dateSelect.dataset.fieldIndex = String(i);
    
            const savedDate = activeClass.sessionDates[i] || '';
    
            // Add the default empty option first
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = '--/--';
            dateSelect.appendChild(defaultOption);
    
            // Populate all other options
            dateOptions.forEach(monthGroup => {
                const optgroup = document.createElement('optgroup');
                optgroup.label = monthGroup.label;
                monthGroup.options.forEach(dateStr => {
                    const option = document.createElement('option');
                    option.value = dateStr;
                    option.textContent = dateStr;
                    optgroup.appendChild(option);
                });
                dateSelect.appendChild(optgroup);
            });
    
            // Set the value of the select element *after* all options are added.
            dateSelect.value = savedDate;
    
            dateSelect.addEventListener('change', (e) => {
                const target = e.target as HTMLSelectElement;
                const index = parseInt(target.dataset.fieldIndex!, 10);
                activeClass.sessionDates[index] = target.value;
                saveState();
                highlightTodayColumn();
            });
    
            dateTh.appendChild(dateSelect);
            dateThFragment.appendChild(dateTh);
    
            // Add session header cell to the bottom row
            const sessionTh = document.createElement('th');
            const sessionLabel = document.createElement('span');
            sessionLabel.className = 'session-header-label';
            sessionLabel.textContent = `الحصة ${i + 1}`;
            sessionTh.appendChild(sessionLabel);
            sessionThFragment.appendChild(sessionTh);
        }
    
        datesRow.appendChild(dateThFragment);
        headerRow.appendChild(sessionThFragment);
    }

    function renderTable() {
        tableBody.innerHTML = '';
        const activeClass = getActiveClass();
        if (!activeClass) return;

        const fragment = document.createDocumentFragment();
        const sortedStudentIds = Object.keys(activeClass.students).sort((a, b) => 
            (studentNameToNumber(activeClass.students[a]?.name) - studentNameToNumber(activeClass.students[b]?.name)) ||
            (activeClass.students[a]?.name.localeCompare(activeClass.students[b]?.name))
        );
        
        function studentNameToNumber(name: string): number {
            if (!name) return Infinity;
            const match = name.match(/\d+$/);
            return match ? parseInt(match[0], 10) : Infinity;
        }


        sortedStudentIds.forEach(studentId => {
            const studentData = activeClass.students[studentId];
            if (!studentData) return;
            
            const row = document.createElement('tr');
            row.dataset.studentId = studentId;

            const nameCell = document.createElement('td');
            nameCell.className = 'student-name';

            const nameSpan = document.createElement('span');
            nameSpan.textContent = studentData.name;
            nameSpan.contentEditable = "true";
            nameSpan.addEventListener('blur', () => {
                const activeCls = getActiveClass();
                if (activeCls) {
                    activeCls.students[studentId].name = nameSpan.textContent || '';
                    saveState();
                    renderTable(); // Re-render to re-sort
                }
            });
             nameSpan.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    nameSpan.blur();
                }
            });
            
            const actionsContainer = document.createElement('div');
            actionsContainer.className = 'student-row-actions';

            const printBtn = document.createElement('button');
            printBtn.className = 'print-student-btn';
            printBtn.innerHTML = '&#128424;'; // Printer icon
            printBtn.dataset.studentId = studentId;
            printBtn.setAttribute('aria-label', `طباعة تقرير ${studentData.name}`);

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-student-btn';
            deleteBtn.innerHTML = '&times;';
            deleteBtn.dataset.studentId = studentId;
            deleteBtn.setAttribute('aria-label', `حذف ${studentData.name}`);

            actionsContainer.appendChild(printBtn);
            actionsContainer.appendChild(deleteBtn);

            nameCell.appendChild(nameSpan);
            nameCell.appendChild(actionsContainer);

            const pointsCell = document.createElement('td');
            pointsCell.className = 'points-cell';
            
            row.appendChild(nameCell);
            row.appendChild(pointsCell);

            studentData.fields.forEach((_, j) => {
                const cell = document.createElement('td');
                const button = document.createElement('button');
                button.className = 'field-button';
                button.dataset.studentId = studentId;
                button.dataset.fieldIndex = String(j);
                button.setAttribute('aria-label', `إضافة حالة لـ ${studentData.name} في الحصة ${j + 1}`);
                updateButtonText(button);
                button.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (activeCellButton === button) hidePopover(); else showPopover(button);
                });
                cell.appendChild(button);
                row.appendChild(cell);
            });
            calculateAndUpdatePoints(row, studentId);
            fragment.appendChild(row);
        });
        tableBody.appendChild(fragment);
    }
    
    // --- Class & Student Management ---
    function addClass() {
        const newClassName = `فصل ${appState.classes.length + 1}`;
        const newClass = createNewClass(newClassName, appState.fieldCount);
        appState.classes.push(newClass);
        switchClass(newClass.id);
    }

    function switchClass(classId: number) {
        if (appState.activeClassId !== classId) {
            appState.activeClassId = classId;
            saveState();
            renderAll();
        }
    }
    
    function handleDeleteClass(classId: number, className: string) {
        if (appState.classes.length <= 1) {
            alert('لا يمكن حذف الفصل الوحيد المتبقي.');
            return;
        }
        showDeleteModal(
            'حذف الفصل',
            `هل أنت متأكد من حذف الفصل "${className}"؟ سيتم حذف جميع بيانات الطلاب المرتبطة به بشكل نهائي.`,
            () => {
                appState.classes = appState.classes.filter(c => c.id !== classId);
                if (appState.activeClassId === classId) {
                    appState.activeClassId = appState.classes[0].id;
                }
                saveState();
                renderAll();
                hideDeleteModal();
            }
        );
    }

    function addStudent() {
        const activeClass = getActiveClass();
        if (!activeClass) return;

        const existingIds = Object.keys(activeClass.students)
            .map(id => parseInt(id.split('-')[1] || '0', 10))
            .filter(num => !isNaN(num));
        const newIdNumber = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 0;
        const studentId = `student-${newIdNumber}`;
        
        activeClass.students[studentId] = createNewStudent(`طالب جديد ${newIdNumber + 1}`);
        saveState();
        renderTable();
    }

    function handleDeleteStudent(studentId: string) {
        const activeClass = getActiveClass();
        if (!activeClass) return;
        const studentName = activeClass.students[studentId]?.name || 'هذا الطالب';
        showDeleteModal(
            'حذف الطالب',
            `هل أنت متأكد من أنك تريد حذف الطالب "${studentName}"؟ لا يمكن التراجع عن هذا الإجراء.`,
            () => {
                delete activeClass.students[studentId];
                saveState();
                renderTable();
                hideDeleteModal();
            }
        );
    }

    function showStudentReport(studentId: string) {
        const activeClass = getActiveClass();
        if (!activeClass || !activeClass.students[studentId]) return;
        const studentData = activeClass.students[studentId];

        // --- Calculate Summaries ---
        let totalMusharaka = 0, totalWajibat = 0, totalBuhuth = 0;
        let totalTaakhur = 0, totalNawm = 0, totalJawwal = 0;

        studentData.fields.forEach(field => {
            totalMusharaka += field[behavioralStates['مشاركة']]?.length || 0;
            totalWajibat += field[taskStates['واجبات']]?.length || 0;
            totalBuhuth += field[taskStates['بحوث']]?.length || 0;
            totalTaakhur += field[behavioralStates['تأخر']]?.length || 0;
            totalNawm += field[behavioralStates['نوم']]?.length || 0;
            totalJawwal += field[behavioralStates['جوال']]?.length || 0;
        });

        const positivePoints = (totalMusharaka + totalWajibat + totalBuhuth) * 0.5;
        const negativePoints = (totalTaakhur + totalNawm + totalJawwal) * -0.5;
        const finalPoints = positivePoints + negativePoints;
        
        // --- Populate Modal ---
        reportStudentName.textContent = studentData.name;
        reportClassName.textContent = activeClass.name;
        reportDate.textContent = new Date().toLocaleDateString('ar-EG-u-nu-latn');
        
        reportMusharaka.textContent = String(totalMusharaka);
        reportWajibat.textContent = String(totalWajibat);
        reportBuhuth.textContent = String(totalBuhuth);
        reportPositivePoints.textContent = positivePoints.toFixed(1);
        
        reportTaakhur.textContent = String(totalTaakhur);
        reportNawm.textContent = String(totalNawm);
        reportJawwal.textContent = String(totalJawwal);
        reportNegativePoints.textContent = negativePoints.toFixed(1);
        
        reportFinalPoints.textContent = finalPoints.toFixed(1);

        // --- Populate Detailed Log ---
        reportDetailsTbody.innerHTML = '';
        const fragment = document.createDocumentFragment();
        studentData.fields.forEach((field, index) => {
            const details: string[] = [];
            let hasData = false;
            let attendance = '---';

            if (field[attendanceStates['غائب']]?.length > 0) {
                attendance = 'غائب';
                hasData = true;
            } else if (field[attendanceStates['حاضر']]?.length > 0) {
                attendance = 'حاضر';
                hasData = true; // Still counts as an event for the log
            }

            Object.entries(behavioralStates).forEach(([name, key]) => {
                const count = field[key]?.length || 0;
                if(count > 0) {
                    details.push(count > 1 ? `${name} (x${count})` : name);
                    hasData = true;
                }
            });
            Object.entries(taskStates).forEach(([name, key]) => {
                if(field[key]?.length > 0) {
                     details.push(name);
                     hasData = true;
                }
            });

            if (hasData) {
                const row = document.createElement('tr');
                const dateCell = document.createElement('td');
                const attendanceCell = document.createElement('td');
                const detailsCell = document.createElement('td');

                dateCell.textContent = activeClass.sessionDates[index] || `الحصة ${index + 1}`;
                attendanceCell.textContent = attendance;
                detailsCell.textContent = details.join('، ') || '---';

                row.appendChild(dateCell);
                row.appendChild(attendanceCell);
                row.appendChild(detailsCell);
                fragment.appendChild(row);
            }
        });

        if (fragment.children.length === 0) {
             const row = document.createElement('tr');
             const cell = document.createElement('td');
             cell.colSpan = 3;
             cell.textContent = 'لا توجد بيانات مسجلة لهذا الطالب.';
             cell.style.textAlign = 'center';
             row.appendChild(cell);
             fragment.appendChild(row);
        }

        reportDetailsTbody.appendChild(fragment);
        reportModal.style.display = 'flex';
    }
    
    function handleImportStudents() {
        const activeClass = getActiveClass();
        if (!activeClass) return;

        const namesText = pasteArea.value;
        const names = namesText.split('\n')
            .map(name => name.trim())
            .filter(name => name.length > 0);

        if (names.length === 0) {
            hideImportModal();
            return;
        }

        const existingIds = Object.keys(activeClass.students)
            .map(id => parseInt(id.split('-')[1] || '0', 10))
            .filter(num => !isNaN(num));
        let newIdNumber = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 0;

        names.forEach(name => {
            const studentId = `student-${newIdNumber}`;
            activeClass.students[studentId] = createNewStudent(name);
            newIdNumber++;
        });

        saveState();
        renderTable();
        hideImportModal();
    }
    
    function handleIncreaseFields() {
        const fieldsToAdd = 5;
        appState.fieldCount += fieldsToAdd;
    
        appState.classes.forEach(cls => {
            for (let i = 0; i < fieldsToAdd; i++) {
                cls.sessionDates.push('');
            }
            Object.values(cls.students).forEach(student => {
                for (let i = 0; i < fieldsToAdd; i++) {
                    student.fields.push(createEmptyField());
                }
            });
        });
    
        saveState();
        renderAll();
    }

    // --- Data Import/Export ---
    function handleExportData() {
        try {
            const jsonString = JSON.stringify(appState, null, 2);
            const blob = new Blob([jsonString], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");

            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            const dateString = `${year}-${month}-${day}`;
            const fileName = `student_tracker_backup_${dateString}.json`;

            link.setAttribute("href", url);
            link.setAttribute("download", fileName);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Failed to export data:", error);
            alert("حدث خطأ أثناء تصدير البيانات.");
        }
    }

    function handleFileSelectForImport(event: Event) {
        const input = event.target as HTMLInputElement;
        if (!input.files || input.files.length === 0) return;

        const file = input.files[0];
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const text = e.target?.result as string;
                const importedState = JSON.parse(text);

                // Basic validation
                if (!importedState.classes || !Array.isArray(importedState.classes) || typeof importedState.activeClassId === 'undefined') {
                    throw new Error("Invalid file format");
                }
                
                showDeleteModal(
                    'تأكيد استيراد البيانات',
                    'تحذير: سيؤدي هذا إلى الكتابة فوق جميع بيانات الفصول والطلاب الحالية. هل أنت متأكد من المتابعة؟',
                    () => {
                        appState = importedState;
                        saveState();
                        loadAndInitializeState(); // Re-run to apply migrations
                        renderAll();
                        hideDeleteModal();
                        alert('تم استيراد البيانات بنجاح!');
                    }
                );
            } catch (error) {
                console.error("Failed to import data:", error);
                alert("فشل استيراد البيانات. يرجى التأكد من أن الملف صالح وغير تالف.");
            } finally {
                // Reset file input to allow re-selection of the same file
                input.value = '';
            }
        };

        reader.onerror = () => {
            alert("حدث خطأ أثناء قراءة الملف.");
             input.value = '';
        };

        reader.readAsText(file);
    }
    
    function handleShareApp() {
        const shareableUrl = getShareableUrl();
        const shareText = `مرحباً،
أود أن أشاركك هذا التطبيق المفيد لمتابعة الطلاب: "سجل متابعة الطلاب".
يمكنك استخدامه مباشرة من خلال الرابط التالي:
${shareableUrl}

التطبيق يعمل في المتصفح ويحفظ بياناتك تلقائياً.`;

        if (navigator.clipboard) {
            navigator.clipboard.writeText(shareText).then(() => {
                const originalText = shareAppBtn.textContent;
                shareAppBtn.textContent = 'تم النسخ!';
                setTimeout(() => {
                    shareAppBtn.textContent = originalText;
                }, 2500);
            }).catch(err => {
                console.error('Failed to copy text: ', err);
                alert('فشل نسخ الرابط. يمكنك نسخه يدوياً من شريط العنوان.');
            });
        } else {
             alert('خاصية النسخ غير مدعومة في متصفحك. يرجى نسخ الرابط يدوياً.');
        }
    }


    // --- Event Listeners Setup ---
    addStudentBtn.addEventListener('click', addStudent);
    importStudentsBtn.addEventListener('click', showImportModal);
    increaseFieldsBtn.addEventListener('click', handleIncreaseFields);
    exportDataBtn.addEventListener('click', handleExportData);
    importDataBtn.addEventListener('click', () => importFileInput.click());
    importFileInput.addEventListener('change', handleFileSelectForImport);
    shareAppBtn.addEventListener('click', handleShareApp);
    openInNewWindowBtn.addEventListener('click', () => {
        window.open(getShareableUrl(), '_blank');
    });
    printTableBtn.addEventListener('click', () => {
        document.body.classList.add('printing-table');
        // Use a small timeout to allow the browser to apply print styles
        setTimeout(() => {
            window.print();
        }, 50);
    });

    tableBody.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const deleteBtn = target.closest('.delete-student-btn');
        const printBtn = target.closest('.print-student-btn');

        if (deleteBtn) {
            const studentId = (deleteBtn as HTMLElement).dataset.studentId;
            if (studentId) handleDeleteStudent(studentId);
        } else if (printBtn) {
            const studentId = (printBtn as HTMLElement).dataset.studentId;
            if (studentId) showStudentReport(studentId);
        }
    });
    
    // Delete Modal Listeners
    modalConfirmBtn.addEventListener('click', () => {
        if (deletionCallback) deletionCallback();
    });
    modalCancelBtn.addEventListener('click', hideDeleteModal);
    deleteModal.addEventListener('click', (e) => { if (e.target === deleteModal) hideDeleteModal(); });

    // Import Modal Listeners
    importConfirmBtn.addEventListener('click', handleImportStudents);
    importCancelBtn.addEventListener('click', hideImportModal);
    importModal.addEventListener('click', (e) => { if (e.target === importModal) hideImportModal(); });
    
    // Report Modal Listeners
    reportPrintBtn.addEventListener('click', () => {
        document.body.classList.add('printing-report');
        // Use a small timeout to allow the browser to apply print styles
        setTimeout(() => {
            window.print();
        }, 50);
    });
    reportCloseBtn.addEventListener('click', hideReportModal);
    reportModal.addEventListener('click', (e) => { if(e.target === reportModal) hideReportModal(); });

    // Global Listeners
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { hidePopover(); hideDeleteModal(); hideImportModal(); hideReportModal(); } });
    document.addEventListener('click', (e) => {
        if (activeCellButton && e.target instanceof Node && !popover.contains(e.target) && !activeCellButton.contains(e.target)) {
            hidePopover();
        }
    });
    
    // Use matchMedia for a more reliable way to clean up print styles
    const mediaQueryList = window.matchMedia('print');
    mediaQueryList.addEventListener('change', (mql) => {
        if (!mql.matches) {
            // This event fires when the print dialog is closed (or printing is finished)
            document.body.classList.remove('printing-report', 'printing-table');
        }
    });

    clearDataBtn.addEventListener('click', () => {
        const activeClass = getActiveClass();
        if (!activeClass) return;
        showDeleteModal(
            'مسح بيانات الفصل',
            `هل أنت متأكد من أنك تريد مسح جميع بيانات الفصل "${activeClass.name}"؟ سيتم حذف جميع الطلاب الحاليين وإضافة 5 طلاب جدد فارغين. لا يمكن التراجع عن هذا الإجراء.`,
            () => {
                activeClass.students = {};
                for (let i = 0; i < 5; i++) {
                    activeClass.students[`student-${i}`] = createNewStudent(`الطالب ${i + 1}`);
                }
                saveState();
                renderTable();
                hideDeleteModal();
            }
        );
    });

    exportCsvBtn.addEventListener('click', () => {
        const activeClass = getActiveClass();
        if (!activeClass) return;
    
        // Helper to safely format a value for CSV
        const formatCsvCell = (value: any): string => {
            const strValue = String(value ?? '');
            if (/[",\n\r]/.test(strValue)) {
                return `"${strValue.replace(/"/g, '""')}"`;
            }
            return strValue;
        };
    
        let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; // UTF-8 BOM
    
        // Define detailed headers for per-session data
        const detailedExportHeaders = [
            'الحضور', 'المشاركة', 'الواجبات', 'بحوث', 'التأخر', 'النوم', 'الجوال'
        ];
    
        // Define summary headers
        const summaryHeaders = [
            'اسم الطالب',
            'مجموع المشاركات',
            'مجموع الواجبات',
            'مجموع البحوث',
            'إجمالي النقاط الإيجابية',
            'مجموع التأخر',
            'مجموع النوم',
            'مجموع استخدام الجوال',
            'إجمالي النقاط السلبية',
            'النقاط النهائية'
        ];
    
        // 1. Create the full header row
        const header: string[] = [...summaryHeaders];
        for (let i = 0; i < appState.fieldCount; i++) {
            header.push(`الحصة ${i + 1} - التاريخ`);
            detailedExportHeaders.forEach(h => {
                header.push(`الحصة ${i + 1} - ${h}`);
            });
        }
        csvContent += header.map(formatCsvCell).join(',') + '\r\n';
    
        // 2. Sort students
        const sortedStudentIds = Object.keys(activeClass.students).sort((a, b) =>
            (studentNameToNumber(activeClass.students[a]?.name) - studentNameToNumber(activeClass.students[b]?.name)) ||
            (activeClass.students[a]?.name.localeCompare(activeClass.students[b]?.name))
        );
    
        function studentNameToNumber(name: string): number {
            if (!name) return Infinity;
            const match = name.match(/\d+$/);
            return match ? parseInt(match[0], 10) : Infinity;
        }
    
        // 3. Create data rows for each student
        sortedStudentIds.forEach(studentId => {
            const studentData = activeClass.students[studentId];
            const rowData: (string | number)[] = [];
    
            // --- Calculate Summaries ---
            let totalMusharaka = 0;
            let totalWajibat = 0;
            let totalBuhuth = 0;
            let totalTaakhur = 0;
            let totalNawm = 0;
            let totalJawwal = 0;
    
            studentData.fields.forEach(field => {
                totalMusharaka += field[behavioralStates['مشاركة']]?.length || 0;
                totalWajibat += field[taskStates['واجبات']]?.length || 0;
                totalBuhuth += field[taskStates['بحوث']]?.length || 0;
                totalTaakhur += field[behavioralStates['تأخر']]?.length || 0;
                totalNawm += field[behavioralStates['نوم']]?.length || 0;
                totalJawwal += field[behavioralStates['جوال']]?.length || 0;
            });
    
            const positivePoints = (totalMusharaka + totalWajibat + totalBuhuth) * 0.5;
            const negativePoints = (totalTaakhur + totalNawm + totalJawwal) * -0.5;
            const finalPoints = positivePoints + negativePoints;
    
            // --- Add Summary Data to Row ---
            rowData.push(
                studentData.name,
                totalMusharaka,
                totalWajibat,
                totalBuhuth,
                positivePoints.toFixed(2),
                totalTaakhur,
                totalNawm,
                totalJawwal,
                negativePoints.toFixed(2),
                finalPoints.toFixed(2)
            );
    
            // --- Add Detailed Per-Session Data to Row ---
            studentData.fields.forEach((field, index) => {
                rowData.push(activeClass.sessionDates[index] || ''); // Date
    
                const isAbsent = field[attendanceStates['غائب']]?.length > 0;
                let attendance = '---';
                if (isAbsent) {
                    attendance = 'غائب';
                } else if (field[attendanceStates['حاضر']]?.length > 0) {
                    attendance = 'حاضر';
                }
    
                rowData.push(attendance);
                rowData.push(isAbsent ? 0 : (field[behavioralStates['مشاركة']]?.length || 0));
                rowData.push(isAbsent ? 0 : (field[taskStates['واجبات']]?.length || 0));
                rowData.push(isAbsent ? 0 : (field[taskStates['بحوث']]?.length || 0));
                rowData.push(isAbsent ? 0 : (field[behavioralStates['تأخر']]?.length || 0));
                rowData.push(isAbsent ? 0 : (field[behavioralStates['نوم']]?.length || 0));
                rowData.push(isAbsent ? 0 : (field[behavioralStates['جوال']]?.length || 0));
            });
    
            csvContent += rowData.map(formatCsvCell).join(',') + '\r\n';
        });
    
        // 4. Create and trigger download link
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        const fileName = `${activeClass.name}_student_data.csv`;
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    // --- Initial Load ---
    loadAndInitializeState();
    renderAll();
});
