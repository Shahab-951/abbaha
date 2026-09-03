const $ = id => document.getElementById(id);
const billAmountInput = $('billAmount');
const unitCountInput = $('unitCount');
const unitsTable = $('unitsTable');
const totalUsage = $('totalUsage');
const result = $('result');

const formatNumber = value => Number(value).toLocaleString('fa-IR');
const formatPlainNumber = value => Number(value).toLocaleString('fa-IR', {
    useGrouping: false
});
const formatMoney = value => `${formatNumber(value)} تومان`;
const escapeHtml = value => String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);

function parseNumber(value) {
    const normalized = String(value).replace(/[۰-۹]/g, digit => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit))).replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit))).replace(/٬/g, '');
    return Number(normalized.replace(/[^0-9.]/g, ''));
}

function currentMode() {
    const selected = document.querySelector('input[name="method"]:checked');
    return selected ? selected.value : null;
}

function formatMoneyInput(input) {
    const value = parseNumber(input.value);
    input.value = Number.isFinite(value) && value > 0 ? formatNumber(value) : '';
}

const persianMonths = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
const persianWeekdays = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];
const isJalaliLeapYear = year => (((year - 474 + 2346) % 2820 + 2820) % 2820 + 474 + 38) * 682 % 2816 < 682;

function jalaliToUtc(year, month, day) {
    let jy = year + 1595, days = -355668 + 365 * jy + Math.floor(jy / 33) * 8 + Math.floor((jy % 33 + 3) / 4) + day + (month < 7 ? (month - 1) * 31 : (month - 7) * 30 + 186);
    let gy = 400 * Math.floor(days / 146097); days %= 146097;
    if (days > 36524) { gy += 100 * Math.floor(--days / 36524); days %= 36524; if (days >= 365) days++; }
    gy += 4 * Math.floor(days / 1461); days %= 1461;
    if (days > 365) { gy += Math.floor((days - 1) / 365); days = (days - 1) % 365; }
    let gd = days + 1, gm = 0; const leap = gy % 4 === 0 && (gy % 100 !== 0 || gy % 400 === 0), daysInMonth = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    while (gd > daysInMonth[gm]) gd -= daysInMonth[gm++];
    return Date.UTC(gy, gm, gd);
}

function toJalali(gy, gm, gd) {
    const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    let gy2 = (gm > 2) ? (gy + 1) : gy;
    let days = 355666 + 365 * gy + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) + Math.floor((gy2 + 399) / 400) + gd + g_d_m[gm - 1];
    let jy = -1595 + 33 * Math.floor(days / 12053);
    days %= 12053;
    jy += 4 * Math.floor(days / 1461);
    days %= 1461;
    if (days > 365) {
        jy += Math.floor((days - 1) / 365);
        days = (days - 1) % 365;
    }
    let jm = (days < 186) ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
    let jd = 1 + ((days < 186) ? (days % 31) : (days - 186) % 30);
    return { year: jy, month: jm, day: jd };
}

function setupJalaliDate(id) {
    const root = $(id);

    const today = new Date();
    const todayJalali = toJalali(
        today.getFullYear(),
        today.getMonth() + 1,
        today.getDate()
    );

    let year = todayJalali.year;
    let month = todayJalali.month;

    const dateNumber = value =>
        Number(value).toLocaleString('fa-IR', {
            useGrouping: false
        });

    root.innerHTML = `
        <button type="button" class="date-trigger">
            انتخاب تاریخ <span>▣</span>
        </button>

        <div class="jalali-calendar" hidden></div>
    `;

    const trigger = root.querySelector('.date-trigger');
    const calendar = root.querySelector('.jalali-calendar');

    const setDate = (selectedYear, selectedMonth, selectedDay) => {
        const yearText = dateNumber(selectedYear);
        const monthText = String(dateNumber(selectedMonth)).padStart(2, '۰');
        const dayText = String(dateNumber(selectedDay)).padStart(2, '۰');

        root.dataset.text = `${yearText}/${monthText}/${dayText}`;
        root.dataset.utc = jalaliToUtc(
            selectedYear,
            selectedMonth,
            selectedDay
        );

        trigger.innerHTML = `${root.dataset.text} <span>▣</span>`;

        calendar.hidden = true;
    };

    const render = () => {
        const count =
            month <= 6
                ? 31
                : month <= 11
                    ? 30
                    : (isJalaliLeapYear(year) ? 30 : 29);

        const offset =
            (new Date(jalaliToUtc(year, month, 1)).getUTCDay() + 1) % 7;

        calendar.innerHTML = `
            <div class="calendar-head">

                <button type="button" data-move="-1" aria-label="ماه قبل">
                    ‹
                </button>

                <b>
                    ${persianMonths[month - 1]} ${dateNumber(year)}
                </b>

                <button type="button" data-move="1" aria-label="ماه بعد">
                    ›
                </button>

            </div>

            <div class="calendar-weekdays">
                ${persianWeekdays
                    .map(day => `<span>${day}</span>`)
                    .join('')}
            </div>

            <div class="calendar-days">

                ${'<span></span>'.repeat(offset)}

                ${Array.from(
                    { length: count },
                    (_, i) => `
                        <button
                            type="button"
                            data-day="${i + 1}"
                        >
                            ${dateNumber(i + 1)}
                        </button>
                    `
                ).join('')}

            </div>

            <div class="calendar-footer">

                <button
                    type="button"
                    class="calendar-today"
                    data-action="today"
                >
                    امروز
                </button>

                <button
                    type="button"
                    class="calendar-cancel"
                    data-action="cancel"
                >
                    انصراف
                </button>

            </div>
        `;

        // دکمه‌های تغییر ماه
        calendar.querySelectorAll('[data-move]').forEach(button => {

            button.onclick = event => {
                event.stopPropagation();

                month += Number(button.dataset.move);

                if (month === 13) {
                    month = 1;
                    year++;
                }

                if (month === 0) {
                    month = 12;
                    year--;
                }

                render();
                calendar.hidden = false;
            };
        });

        // انتخاب روز
        calendar.querySelectorAll('[data-day]').forEach(button => {

            button.onclick = event => {
                event.stopPropagation();

                const day = Number(button.dataset.day);

                setDate(
                    year,
                    month,
                    day
                );
            };
        });

        // دکمه امروز
        const todayButton = calendar.querySelector(
            '[data-action="today"]'
        );

        todayButton.onclick = event => {
            event.stopPropagation();

            year = todayJalali.year;
            month = todayJalali.month;

            setDate(
                todayJalali.year,
                todayJalali.month,
                todayJalali.day
            );
        };

        // دکمه انصراف
        const cancelButton = calendar.querySelector(
            '[data-action="cancel"]'
        );

        cancelButton.onclick = event => {
            event.stopPropagation();

            calendar.hidden = true;
        };
    };

    trigger.onclick = event => {
        event.stopPropagation();

        document
            .querySelectorAll('.jalali-calendar:not([hidden])')
            .forEach(cal => {
                if (cal !== calendar) {
                    cal.hidden = true;
                }
            });

        calendar.hidden = !calendar.hidden;

        if (!calendar.hidden) {
            render();
        }
    };

    document.addEventListener('click', event => {
        if (!root.contains(event.target)) {
            calendar.hidden = true;
        }
    });
}

function setDeadlineState() {
    const isUrgent = $('urgentPayment').checked;
    const deadlinePicker = $('paymentDeadline');
    const trigger = deadlinePicker.querySelector('.date-trigger');
    
    trigger.disabled = isUrgent;
    
    if (isUrgent) {
        trigger.innerHTML = 'انتخاب تاریخ <span>▣</span>';
        deadlinePicker.dataset.text = '';
        deadlinePicker.dataset.utc = '';
        deadlinePicker.classList.add('deadline-disabled');
    } else {
        deadlinePicker.classList.remove('deadline-disabled');
    }
}

function toggleFormVisibility() {
    const method = currentMode();
    const sections = document.querySelectorAll('.form-section');
    
    if (method) {
        sections.forEach(section => section.classList.remove('hidden'));
    } else {
        sections.forEach(section => section.classList.add('hidden'));
    }
}

function disableScrollOnNumberInputs() {
    document.querySelectorAll('input[type="number"]').forEach(input => {
        if (input.dataset.preventWheelChange) return;

        input.addEventListener('wheel', (e) => {
            e.preventDefault();
        });

        input.dataset.preventWheelChange = 'true';
    });
}

function createUnitsTable() {
    const oldRows = document.querySelectorAll('#unitsTable tbody tr');
    const oldData = [];
    if (currentMode() === 'people') {
        oldRows.forEach(row => {
            const unit = row.querySelector('.unit-number')?.value || '';
            const people = row.querySelector('.people-value')?.value || '';
            oldData.push({ unit, people });
        });
    } else if (currentMode()) {
        oldRows.forEach(row => {
            const unit = row.querySelector('.unit-number')?.value || '';
            const prev = row.querySelector('.previous-reading')?.value || '';
            const curr = row.querySelector('.current-reading')?.value || '';
            oldData.push({ unit, prev, curr });
        });
    }

    if (currentMode() === 'people') {
        $('unitsTitle').textContent = 'تعداد نفرات واحدها';
        $('unitsHelp').textContent = 'تعداد افراد ساکن در هر واحد را وارد کنید.';
        $('totalLabel').textContent = 'تعداد کل نفرات';
    } else if (currentMode()) {
        $('unitsTitle').textContent = 'اطلاعات کنتور واحدها';
        $('unitsHelp').textContent = 'رقم قبلی و رقم فعلی کنتور هر واحد را وارد کنید؛ مقدار مصرف خودکار محاسبه می‌شود.';
        $('totalLabel').textContent = 'مجموع مصرف کنتورهای فرعی';
    }

    const unitCount = parseNumber(unitCountInput.value);
    setUnitEditingState(false);
    unitsTable.innerHTML = '';
    totalUsage.textContent = '۰';
    if (!Number.isInteger(unitCount) || unitCount <= 0) return;

    const unitCell = index => `<td><input type="number" class="unit-number" value="${index + 1}" min="1" readonly aria-label="شماره واحد ${index + 1}"></td>`;
    const editButton = '<button type="button" class="unit-edit-btn" title="ویرایش شماره واحدها" aria-label="ویرایش شماره واحدها">✎</button>';
    if (currentMode() === 'people') {
        const rows = Array.from({ length: unitCount }, (_, index) => `<tr>${unitCell(index)}<td><input type="number" class="people-value" min="1" inputmode="numeric" pattern="[0-9]*" aria-label="تعداد نفرات واحد ${index + 1}"></td></tr>`).join('');
        unitsTable.innerHTML = `<table><thead><tr><th>واحد${editButton}</th><th>تعداد نفرات</th></tr></thead><tbody>${rows}</tbody></table>`;
        unitsTable.querySelectorAll('.people-value').forEach(input => input.addEventListener('input', updateTotal));
    } else if (currentMode()) {
        const rows = Array.from({ length: unitCount }, (_, index) => `<tr>${unitCell(index)}<td><input type="number" class="previous-reading" min="0" inputmode="numeric" pattern="[0-9]*" aria-label="رقم قبلی واحد ${index + 1}"></td><td><input type="number" class="current-reading" min="0" inputmode="numeric" pattern="[0-9]*" aria-label="رقم فعلی واحد ${index + 1}"></td><td class="calculated-consumption">۰</td></tr>`).join('');
        unitsTable.innerHTML = `<table><thead><tr><th>واحد${editButton}</th><th>رقم قبلی</th><th>رقم فعلی</th><th>مقدار مصرف</th></tr></thead><tbody>${rows}</tbody></table>`;
        unitsTable.querySelectorAll('.previous-reading, .current-reading').forEach(input => input.addEventListener('input', updateTotal));
    }

    const editBtn = unitsTable.querySelector('.unit-edit-btn');
    if (editBtn) {
        editBtn.addEventListener('click', toggleUnitEditing);
    }
    const unitInputs = unitsTable.querySelectorAll('.unit-number');
    unitInputs.forEach(input => input.addEventListener('input', handleUnitNumberInput));
    if (unitInputs[0]) {
        unitInputs[0].addEventListener('change', handleFirstUnitNumberChange);
    }

    const newRows = document.querySelectorAll('#unitsTable tbody tr');
    if (currentMode() === 'people') {
        newRows.forEach((row, index) => {
            if (oldData[index]) {
                const peopleInput = row.querySelector('.people-value');
                if (peopleInput) peopleInput.value = oldData[index].people || '';
            }
        });
    } else if (currentMode()) {
        newRows.forEach((row, index) => {
            if (oldData[index]) {
                const prevInput = row.querySelector('.previous-reading');
                const currInput = row.querySelector('.current-reading');
                if (prevInput) prevInput.value = oldData[index].prev || '';
                if (currInput) currInput.value = oldData[index].curr || '';
            }
        });
    }

    updateTotal();
    disableScrollOnNumberInputs();
}

function toggleUnitEditing(event) {
    const inputs = [...unitsTable.querySelectorAll('.unit-number')];

    if (inputs.length === 0) return;

    const isCurrentlyReadOnly = inputs[0].readOnly;

    // ورود به حالت ویرایش
    if (isCurrentlyReadOnly) {
        inputs.forEach(input => {
            input.readOnly = false;
        });

        event.currentTarget.textContent = '✓';
        event.currentTarget.title = 'ثبت شماره واحدها';

        setUnitEditingState(true);

        inputs[0].focus();
        return;
    }

    // تلاش برای ثبت تغییرات
    const isValid = markDuplicateUnits();

    if (!isValid) {
        showUnitEditError();
        return;
    }

    // ثبت تغییرات
    inputs.forEach(input => {
        input.readOnly = true;
    });

    event.currentTarget.textContent = '✎';
    event.currentTarget.title = 'ویرایش شماره واحدها';

    clearUnitEditError();
    setUnitEditingState(false);
}

function setUnitEditingState(isEditing) {
    unitsTable.classList.toggle('is-editing-units', isEditing);

    if (isEditing) {
        unitsTable.dataset.unitNumbersBeforeEdit = JSON.stringify(
            [...unitsTable.querySelectorAll('.unit-number')]
                .map(input => input.value)
        );
    } else {
        delete unitsTable.dataset.unitNumbersBeforeEdit;
    }
}

function hasUnconfirmedUnitChanges() {
    if (!unitsTable.classList.contains('is-editing-units')) return false;

    const beforeEdit = JSON.parse(
        unitsTable.dataset.unitNumbersBeforeEdit || '[]'
    );
    const currentValues = [...unitsTable.querySelectorAll('.unit-number')]
        .map(input => input.value);

    return beforeEdit.length !== currentValues.length ||
        beforeEdit.some((value, index) => value !== currentValues[index]);
}

function handleUnitNumberInput(event) {
    clearUnitEditError();

    const inputs = [...unitsTable.querySelectorAll('.unit-number')];
    const isEditingFirstUnit =
        event?.currentTarget === inputs[0] &&
        unitsTable.classList.contains('is-editing-units');

    // شماره اول ممکن است مبنای شماره‌گذاری جدید باشد؛
    // بررسی تکراری‌بودن آن پس از پاسخ کاربر انجام می‌شود.
    if (isEditingFirstUnit) return;

    markDuplicateUnits();
}

function handleFirstUnitNumberChange(event) {
    const firstInput = event.currentTarget;
    const startNumber = parseNumber(firstInput.value);
    const inputs = [...unitsTable.querySelectorAll('.unit-number')];

    if (!Number.isInteger(startNumber) || startNumber <= 0 || inputs.length < 2) {
        markDuplicateUnits();
        return;
    }

    const shouldRenumber = window.confirm(
        'شماره واحدهای بعدی نیز به‌ترتیب شماره‌گذاری شوند؟'
    );

    if (shouldRenumber) {
        inputs.forEach((input, index) => {
            input.value = startNumber + index;
        });
    }

    handleUnitNumberInput();
}

function updateTotal() {
    if (currentMode() === 'people') {
        totalUsage.textContent =
    formatPlainNumber(
        [...document.querySelectorAll('.people-value')]
            .reduce(
                (sum, input) =>
                    sum + (parseNumber(input.value) || 0),
                0
            )
    );

        markDuplicateUnits();
        return;
    }

    if (!currentMode()) return;

    let total = 0;

    document
        .querySelectorAll('#unitsTable tbody tr')
        .forEach(row => {

            const previousInput =
                row.querySelector('.previous-reading');

            const currentInput =
                row.querySelector('.current-reading');

            const consumptionCell =
                row.querySelector('.calculated-consumption');

            const previousValue =
                previousInput.value.trim();

            const currentValue =
                currentInput.value.trim();

            // -------------------------------------------------
            // تا وقتی هر دو مقدار وارد نشده‌اند،
            // اعتبارسنجی و محاسبه انجام نشود.
            // -------------------------------------------------

            if (
                previousValue === '' ||
                currentValue === ''
            ) {
                row.classList.remove('reading-error');

                consumptionCell.textContent =
                    '۰';

                return;
            }

            const previous =
                parseNumber(previousValue);

            const current =
                parseNumber(currentValue);

            // -------------------------------------------------
            // وقتی هر دو مقدار وارد شدند،
            // مصرف را محاسبه و اعتبارسنجی می‌کنیم.
            // -------------------------------------------------

            const consumption =
                current - previous;

            const hasError =
                !Number.isFinite(previous) ||
                !Number.isFinite(current) ||
                previous < 0 ||
                current < 0 ||
                consumption < 0;

            row.classList.toggle(
                'reading-error',
                hasError
            );

            if (hasError) {

                consumptionCell.textContent =
                    'خطا';

                return;
            }

            consumptionCell.textContent =
               formatPlainNumber(consumption);

            total += consumption;
        });

    totalUsage.textContent =
    formatPlainNumber(total);

    markDuplicateUnits();
}

function markDuplicateUnits() {
    const inputs = [...document.querySelectorAll('.unit-number')];

    const counts = inputs.reduce((map, input) => {
        const unit = input.value.trim();
        const unitKey = unit === '' ? '' : String(parseNumber(unit));

        if (unit !== '') {
            map[unitKey] = (map[unitKey] || 0) + 1;
        }

        return map;
    }, {});

    let isValid = true;

    inputs.forEach(input => {
        const value = input.value.trim();
        const number = parseNumber(value);

        const isInvalid =
            value === '' ||
            !Number.isInteger(number) ||
            number <= 0 ||
            counts[String(number)] > 1;

        input.closest('tr').classList.toggle('input-error', isInvalid);

        if (isInvalid) {
            isValid = false;
        }
    });

    return isValid;
}

function showUnitEditError(message) {
    clearUnitEditError();

    if (message) {
        const error = document.createElement('div');
        error.className = 'table-validation-error unit-edit-error';
        error.innerHTML = `<strong>⚠️ ${message}</strong>`;

        unitsTable.parentElement.insertBefore(error, unitsTable);
        return;
    }

    const inputs = [...document.querySelectorAll('.unit-number')];

    const duplicateUnits = {};

    inputs.forEach(input => {
        const value = input.value.trim();
        const unitKey = value === '' ? '' : String(parseNumber(value));

        if (value !== '') {
            duplicateUnits[unitKey] =
                (duplicateUnits[unitKey] || 0) + 1;
        }
    });

    const errors = [];

    Object.keys(duplicateUnits).forEach(unit => {
        if (duplicateUnits[unit] > 1) {
            errors.push(
                `شماره واحد «${formatPlainNumber(unit)}» تکراری است.`
            );
        }
    });

    const emptyExists = inputs.some(
        input => input.value.trim() === ''
    );

    if (emptyExists) {
    errors.push(
        'شماره واحد نمی‌تواند خالی باشد.'
    );
}

const nonPositiveExists = inputs.some(input => {
    const value = input.value.trim();

    if (value === '') {
        return false;
    }

    const number = parseNumber(value);

    return (
        !Number.isFinite(number) ||
        !Number.isInteger(number) ||
        number <= 0
    );
});

if (nonPositiveExists) {
    errors.push(
        'شماره واحد نمی‌تواند صفر باشد.'
    );
}

    const error = document.createElement('div');
    error.className = 'table-validation-error unit-edit-error';

    error.innerHTML = `
        <strong>⚠️ شماره واحدها قابل ثبت نیستند.</strong>
        <ul>
            ${errors.map(message => `<li>${escapeHtml(message)}</li>`).join('')}
        </ul>
    `;

    unitsTable.parentElement.insertBefore(
        error,
        unitsTable
    );

    error.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
    });
}

function clearUnitEditError() {
    document
        .querySelectorAll('.unit-edit-error')
        .forEach(error => error.remove());
}

function showMethodDescription() {
    const method = currentMode();
    const descriptions = {
        'sub-meter': 'مبلغ قبوض بر اساس مجموع مصرف کنتورهای فرعی تقسیم می‌شود و اختلاف بین مصرف کنتورهای اصلی و فرعی به نسبت مصرف هر واحد، بین واحدها توزیع می‌گردد.',
        'main-meter': 'مبلغ قبوض بر اساس مجموع مصرف کنتورهای اصلی تقسیم می‌شود و سهم هر واحد بر اساس مصرف کنتور فرعی آن واحد تعیین می‌گردد. سپس باقی‌مانده به طور مساوی بین همهٔ واحدها تقسیم می‌شود.',
        'people': 'مبلغ قبوض بر اساس تعداد کل نفرات تقسیم می‌شود و سهم هر واحد بر اساس تعداد ساکنان آن تعیین می‌گردد.'
    };
    
    document.querySelectorAll('.method-description').forEach(el => el.hidden = true);
    
    if (method && descriptions[method]) {
        const descEl = document.getElementById(`desc-${method}`);
        if (descEl) {
            descEl.textContent = descriptions[method];
            descEl.hidden = false;
        }
    }
}

function showMode() {
    const method = currentMode();

    // پاک کردن تمام خطاهای روش قبلی
    clearValidationErrors();

    // نمایش/مخفی کردن گزینه‌های مربوط به کنتور
    $('meterOptions').hidden =
        method !== 'sub-meter' &&
        method !== 'main-meter';

    $('mainMeterGroup').hidden =
        method !== 'main-meter';

    // گزینه واحدهای بدون مصرف
    // فقط در روش دوم نمایش داده شود
    const zeroConsumptionOption =
        $('zeroConsumptionOption');

    if (zeroConsumptionOption) {
        zeroConsumptionOption.style.display =
            method === 'main-meter'
                ? 'flex'
                : 'none';

        if (method !== 'main-meter') {
            $('excludeZeroConsumption').checked = false;
        }
    }

    // اگر روش دوم انتخاب نشده، مقدار کنتور اصلی پاک شود
    if (method !== 'main-meter') {
        $('mainMeter').value = '';
    }

    showMethodDescription();

    createUnitsTable();

    result.innerHTML = '';

    toggleFormVisibility();
}

function getReadings() {
    return [...document.querySelectorAll('#unitsTable tbody tr')].map(row => ({ unit: parseNumber(row.querySelector('.unit-number').value), previous: parseNumber(row.querySelector('.previous-reading').value), current: parseNumber(row.querySelector('.current-reading').value) }));
}

function getPeople() {
    return [...document.querySelectorAll('#unitsTable tbody tr')].map(row => ({ unit: parseNumber(row.querySelector('.unit-number').value), people: parseNumber(row.querySelector('.people-value').value) }));
}

function getBillInfo() {
    const billAmount = parseNumber(billAmountInput.value);
    if (!Number.isFinite(billAmount) || billAmount <= 0) {
        throw new Error('مبلغ قبوض را وارد کنید.');
    }
    return { total: billAmount };
}

function getSelectedDate(id, label) {
    const picker = $(id);
    if (!picker.dataset.utc) throw new Error(`${label} را انتخاب کنید.`);
    return { text: picker.dataset.text, utc: Number(picker.dataset.utc) };
}

function periodDetails() {
    const start = getSelectedDate('periodStart', 'تاریخ قرائت قبلی');
    const end = getSelectedDate('periodEnd', 'تاریخ قرائت فعلی');
    const days = Math.round((end.utc - start.utc) / 86400000);
    if (days <= 0) throw new Error('تاریخ قرائت فعلی باید بعد از تاریخ قرائت قبلی باشد.');
    return { start: start.text, end: end.text, days };
}

function getMonthFromDate(dateText) {
    const parts = dateText.split('/');
    if (parts.length === 3) {
        const monthNum = parseInt(parts[1].replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
        return persianMonths[monthNum - 1] || '';
    }
    return '';
}

// ===================== سیستم نمایش خطا =====================

function clearValidationErrors() {
    document.querySelectorAll(
        '.field-error, .table-validation-error'
    ).forEach(error => error.remove());

    document.querySelectorAll('.validation-error').forEach(element => {
        element.classList.remove('validation-error');
    });

    document.querySelectorAll('#unitsTable tbody tr').forEach(row => {
        row.classList.remove('validation-row-error');
    });
}

function showFieldError(element, message) {
    if (!element) return;

    element.classList.add('validation-error');

    const error = document.createElement('div');
    error.className = 'field-error';
    error.textContent = message;

    // خطا مستقیماً بعد از خود فیلد قرار می‌گیرد
    element.insertAdjacentElement('afterend', error);
}

function showTableErrors(
    messages,
    summaryMessages = []
) {
    const genericMessage =
        'لطفاً فیلدهای مشخص‌شده را تکمیل یا اصلاح کنید.';

    const filteredSummaries =
        summaryMessages.filter(
            message => message !== genericMessage
        );

    if (
        !messages.length &&
        !summaryMessages.length
    ) {
        return;
    }

    const error =
        document.createElement('div');

    error.className =
        'table-validation-error';

    error.innerHTML = `
        <strong>
            ⚠️ لطفاً فیلدهای مشخص‌شده را تکمیل یا اصلاح کنید.
        </strong>

        ${
            filteredSummaries.length
                ? `
                    <ul>
                        ${filteredSummaries
                            .map(
                                message =>
                                    `<li>${escapeHtml(message)}</li>`
                            )
                            .join('')}
                    </ul>
                `
                : ''
        }
    `;

    unitsTable.parentElement.insertBefore(
        error,
        unitsTable
    );
}

function scrollToFirstError() {
    const firstError =
        document.querySelector('.validation-error') ||
        document.querySelector('.table-validation-error');

    if (!firstError) return;

    firstError.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
    });

    // اگر خطا مربوط به یک فیلد باشد، فیلد را فعال می‌کنیم
    // ولی اجازه نمی‌دهیم focus دوباره صفحه را جابه‌جا کند.
    if (
        firstError.matches(
            'input, select, textarea, button'
        )
    ) {
        firstError.focus({
            preventScroll: true
        });
    }
}

function validateForm() {
    clearValidationErrors();

    let isValid = true;
    const method = currentMode();
    const tableErrors = [];
    const tableErrorSummaries = [];
    let hasIncompleteTableFields = false;

    if (hasUnconfirmedUnitChanges()) {
    showUnitEditError(
        'تغییرات شماره واحدها هنوز ثبت نشده‌اند. برای ثبت، روی ✓ بزنید.'
    );

    isValid = false;
    }

    // دکمه محاسبه بدون انتخاب روش نمایش داده نمی‌شود؛
    // این شرط فقط برای جلوگیری از اجرای ناخواسته است.
    if (!method) return false;

    // ===================== اطلاعات قبض =====================

    const billAmount = parseNumber(billAmountInput.value);

    if (!Number.isFinite(billAmount) || billAmount <= 0) {
        showFieldError(
            billAmountInput,
            'مبلغ قبض را وارد کنید.'
        );
        isValid = false;
    }

    const unitCount = parseNumber(unitCountInput.value);

    if (
        !Number.isInteger(unitCount) ||
        unitCount < 1 ||
        unitCount > 200
    ) {
        showFieldError(
            unitCountInput,
            'تعداد واحدها باید بین ۱ تا ۲۰۰ باشد.'
        );
        isValid = false;
    }

    // ===================== تاریخ‌ها =====================

    let periodStart;
    let periodEnd;

    try {
        periodStart = getSelectedDate(
            'periodStart',
            'تاریخ قرائت قبلی'
        );
    } catch (e) {
        showFieldError(
            $('periodStart'),
            'تاریخ قرائت قبلی را انتخاب کنید.'
        );
        isValid = false;
    }

    try {
        periodEnd = getSelectedDate(
            'periodEnd',
            'تاریخ قرائت فعلی'
        );
    } catch (e) {
        showFieldError(
            $('periodEnd'),
            'تاریخ قرائت فعلی را انتخاب کنید.'
        );
        isValid = false;
    }

    if (periodStart && periodEnd && periodEnd.utc <= periodStart.utc) {
        $('periodStart').classList.add('validation-error');
        showFieldError(
            $('periodEnd'),
            'بازه تاریخ قرائت معتبر نیست؛ تاریخ فعلی باید بعد از تاریخ قبلی باشد.'
        );
        isValid = false;
    }

    if (!$('urgentPayment').checked) {
        try {
            getSelectedDate(
                'paymentDeadline',
                'مهلت پرداخت'
            );
        } catch (e) {
            showFieldError(
                $('paymentDeadline'),
                'مهلت پرداخت را انتخاب کنید.'
            );
            isValid = false;
        }
    }

    // ===================== کنتور اصلی =====================

    if (method === 'main-meter') {
        const mainMeter = parseNumber(
            $('mainMeter').value
        );

        if (
            !Number.isFinite(mainMeter) ||
            mainMeter <= 0
        ) {
            showFieldError(
                $('mainMeter'),
                'مصرف کنتورهای اصلی را وارد کنید.'
            );
            isValid = false;
        }
    }

 // ===================== روش کنتور فرعی / اصلی =====================

if (
    method === 'sub-meter' ||
    method === 'main-meter'
) {
    const rows =
        document.querySelectorAll(
            '#unitsTable tbody tr'
        );

    if (rows.length === 0) {
        isValid = false;

    } else {

        let hasIncompleteReadings = false;
        let hasNegativeReading = false;

        rows.forEach(row => {

            const prevInput =
                row.querySelector(
                    '.previous-reading'
                );

            const currInput =
                row.querySelector(
                    '.current-reading'
                );

            const prevValue =
                prevInput.value.trim();

            const currValue =
                currInput.value.trim();

            let rowHasError = false;

            // =============================================
            // مرحله اول: بررسی خالی بودن
            // =============================================

            if (
                prevValue === '' ||
                currValue === ''
            ) {
                hasIncompleteReadings = true;
                rowHasError = true;
            }

            // =============================================
            // مرحله دوم:
            // فقط وقتی هر دو فیلد پر هستند
            // بررسی معتبر بودن اعداد و ترتیب آنها
            // =============================================

            if (
                prevValue !== '' &&
                currValue !== ''
            ) {

                const previous =
                    parseNumber(prevValue);

                const current =
                    parseNumber(currValue);

                if (
                    !Number.isFinite(previous) ||
                    !Number.isFinite(current) ||
                    previous < 0 ||
                    current < 0
                ) {
                    rowHasError = true;
                }

                // رقم فعلی نباید کمتر از رقم قبلی باشد
                if (
                    Number.isFinite(previous) &&
                    Number.isFinite(current) &&
                    current < previous
                ) {
                    hasNegativeReading = true;
                    rowHasError = true;
                }
            }

            if (rowHasError) {
                row.classList.add(
                    'validation-row-error'
                );

                isValid = false;
            }
        });

        // =============================================
        // اگر حتی یک فیلد خالی باشد،
        // فقط پیام کلی نمایش داده شود.
        // =============================================

        if (hasIncompleteReadings) {

            tableErrorSummaries.push(
                'لطفاً فیلدهای مشخص‌شده را تکمیل یا اصلاح کنید.'
            );

        } else {

            // =============================================
            // همه فیلدها پر هستند.
            // حالا مجموع مصرف معتبر را محاسبه می‌کنیم.
            // =============================================

            let validTotalConsumption = 0;

            rows.forEach(row => {

                const previous =
                    parseNumber(
                        row.querySelector(
                            '.previous-reading'
                        ).value
                    );

                const current =
                    parseNumber(
                        row.querySelector(
                            '.current-reading'
                        ).value
                    );

                // فقط ردیف‌هایی که رقم فعلی از قبلی
                // کمتر نیست وارد مجموع می‌شوند.
                if (
                    Number.isFinite(previous) &&
                    Number.isFinite(current) &&
                    previous >= 0 &&
                    current >= 0 &&
                    current >= previous
                ) {
                    validTotalConsumption +=
                        current - previous;
                }
            });

            // =============================================
            // خطای مصرف منفی
            // =============================================

            if (hasNegativeReading) {

                tableErrorSummaries.push(
                    'رقم فعلی کنتور نمی‌تواند کمتر از رقم قبلی باشد.'
                );
            }

            // =============================================
            // خطای مجموع مصرف صفر
            //
            // حتی اگر همزمان خطای مصرف منفی وجود داشته باشد،
            // این خطا نیز مستقل بررسی می‌شود.
            // =============================================

            if (validTotalConsumption === 0) {

                tableErrorSummaries.push(
                    'مجموع مصرف کنتورهای فرعی باید بیشتر از صفر باشد.'
                );

                isValid = false;
            }
        }
    }
}

    // ===================== روش تعداد نفرات =====================

    if (method === 'people') {

        const rows =
            document.querySelectorAll(
                '#unitsTable tbody tr'
            );

        if (rows.length === 0) {
            isValid = false;

        } else {

rows.forEach((row, index) => {

    const peopleInput =
        row.querySelector(
            '.people-value'
        );

    const unitInput =
        row.querySelector(
            '.unit-number'
        );

    const unit =
        unitInput
            ? unitInput.value.trim()
            : index + 1;

    const peopleValue =
        peopleInput.value.trim();

    let rowHasError = false;

    if (peopleValue === '') {

        rowHasError = true;

        tableErrors.push(
            `واحد ${unit}: تعداد نفرات وارد نشده است.`
        );

    } else {

        const people =
            parseNumber(peopleValue);

        if (
            isNaN(people) ||
            people < 1 ||
            !Number.isInteger(people)
        ) {
            rowHasError = true;

            tableErrors.push(
                `واحد ${unit}: تعداد نفرات معتبر نیست.`
            );
        }
    }

    if (rowHasError) {
        row.classList.add(
            'validation-row-error'
        );

        isValid = false;
    }
});
        }
    }

    // ===================== نمایش خطاهای جدول =====================

    // ===================== نمایش خطاهای جدول =====================

// ===================== نمایش خطاهای جدول =====================

if (
    tableErrors.length > 0 ||
    tableErrorSummaries.length > 0
) {
    showTableErrors(
        tableErrors,
        tableErrorSummaries
    );
}

return isValid;
}

function renderResult(calculation, bills, period) {
    const isMeter = currentMode() !== 'people';
    const header = isMeter ? '<tr><th>واحد</th><th>رقم قبلی</th><th>رقم فعلی</th><th>مقدار مصرف</th><th>مبلغ</th></tr>' : '<tr><th>واحد</th><th>تعداد نفرات</th><th>مبلغ</th></tr>';
    const rows = calculation.rows.map(row => isMeter
    ? `<tr><td>${formatPlainNumber(row.unit)}</td><td>${formatPlainNumber(row.previous)}</td><td>${formatPlainNumber(row.current)}</td><td>${formatPlainNumber(row.consumption)}</td><td>${formatMoney(row.amount)}</td></tr>`
    : `<tr><td>${formatPlainNumber(row.unit)}</td><td>${formatPlainNumber(row.people)}</td><td>${formatMoney(row.amount)}</td></tr>`
).join('');
    const deadline = $('urgentPayment').checked ? 'فوری' : getSelectedDate('paymentDeadline', 'مهلت پرداخت').text;
    const cardValue = $('cardNumber').value.trim();

const card = cardValue
    ? `<span class="card-number" dir="auto">${escapeHtml(cardValue)}</span>`
    : 'ثبت نشده';
    const notes = $('notes').value.trim() ? `<p><b>توضیحات:</b> ${escapeHtml($('notes').value).replace(/\n/g, '<br>')}</p>` : '';
    const summary = isMeter
    ? `<p><b>مجموع مصرف:</b> ${formatPlainNumber(calculation.totalConsumption)}</p>${calculation.mainMeter ? `<p><b>مجموع مصرف کنتورهای اصلی:</b> ${formatPlainNumber(calculation.mainMeter)}</p>` : ''}`
    : `<p><b>تعداد کل نفرات:</b> ${formatPlainNumber(calculation.totalPeople)}</p>`;
    const remainder = calculation.remainder === undefined ? '' : `<p><b>باقی‌مانده تقسیم شده:</b> ${formatMoney(Math.round(calculation.remainder))}</p><p><b>سهم باقی‌مانده هر واحد:</b> ${formatMoney(Math.round(calculation.equalShare))}</p>`;
    
    const totalAmount = `<p><b>مجموع مبلغ قبوض:</b> ${formatMoney(calculation.billAmount)}</p>`;
    
    let perPersonShare = '';
    if (currentMode() === 'people' && calculation.totalPeople > 0) {
        const perPerson = calculation.billAmount / calculation.totalPeople;
        perPersonShare = `<p><b>سهم هر نفر:</b> ${formatMoney(Math.round(perPerson))}</p>`;
    }
    
    const monthName = getMonthFromDate(period.end);
    
    const printButton = `<div style="text-align: center; margin-top: 20px;" class="no-print">
    <button id="printBtnInside" class="secondary-button" style="display: inline-block; padding: 10px 20px;">
        🖨️ چاپ
    </button>

    <button id="pdfBtnInside" class="secondary-button" style="display: inline-block; padding: 10px 20px; margin-right: 8px;">
        📄 دریافت PDF
    </button>

    <button id="excelBtnInside" class="secondary-button" style="display: inline-block; padding: 10px 20px; margin-right: 8px;">
        📊 دریافت Excel
    </button>
</div>`;

    result.innerHTML = `<table><thead>${header}</thead><tbody>${rows}</tbody></table><div class="result-summary"><p><b>صورت حساب ${monthName}</b></p><p><b>دوره قبض:</b> ${period.start} تا ${period.end} (${formatNumber(period.days)} روز)</p>${summary}${totalAmount}${perPersonShare}${remainder}<p><b>مهلت پرداخت:</b> ${deadline}</p><p><b>شماره کارت ساختمان:</b> ${card}</p>${notes}</div>${printButton}`;

    const printBtnInside = document.getElementById('printBtnInside');

if (printBtnInside) {
    printBtnInside.addEventListener('click', function() {
        window.print();
    });
}

const pdfBtnInside = document.getElementById('pdfBtnInside');

if (pdfBtnInside) {
    pdfBtnInside.addEventListener('click', function() {
        generatePDF();
    });
}

const excelBtnInside = document.getElementById('excelBtnInside');

if (excelBtnInside) {
    excelBtnInside.addEventListener('click', function() {
        generateExcel(calculation, bills, period);
    });
}
}

function generateExcel(calculation, bills, period) {
    if (typeof XLSX === 'undefined') {
        alert('کتابخانه Excel بارگذاری نشده است.');
        return;
    }

    try {
        const mode = currentMode();

        const isSubMeterMode = mode === 'sub-meter';
        const isMainMeterMode = mode === 'main-meter';
        const isPeopleMode = mode === 'people';

        // =====================================================
        // اطلاعات عمومی
        // =====================================================

        const deadline = $('urgentPayment').checked
            ? 'فوری'
            : ($('paymentDeadline').dataset.text || 'ثبت نشده');

        const cardNumber =
            $('cardNumber').value.trim() || 'ثبت نشده';

        const notes =
            $('notes').value.trim() || '';

        let methodName = '';

        if (isSubMeterMode) {
            methodName = 'تقسیم قبض بر اساس مصرف کنتورهای فرعی';
        } else if (isMainMeterMode) {
            methodName = 'تقسیم با کنتور اصلی و تقسیم اختلاف';
        } else if (isPeopleMode) {
            methodName = 'تقسیم قبض بر اساس تعداد نفرات';
        }

        // =====================================================
        // توابع کمکی
        // =====================================================

        const cleanNumber = (value) => {
            return Math.round(Number(value) || 0);
        };

        const toPersianDigits = (value) => {
            return String(value).replace(
                /\d/g,
                digit => '۰۱۲۳۴۵۶۷۸۹'[digit]
            );
        };

        const formatDaysWithParentheses = (days) => {
    const RLM = '\u200F';

    return `(${RLM}${toPersianDigits(cleanNumber(days))} روز${RLM})`;
};

        // =====================================================
        // داده‌های Excel
        // =====================================================

        const data = [
            ['گزارش قبض آب ساختمان'],
            []
        ];

        // =====================================================
        // جدول اصلی واحدها
        // =====================================================

        if (isPeopleMode) {

            data.push([
                'واحد',
                'تعداد نفرات',
                'مبلغ سهم واحد (تومان)'
            ]);

            calculation.rows.forEach(row => {
                data.push([
                    row.unit,
                    row.people,
                    cleanNumber(row.amount)
                ]);
            });

        } else {

            data.push([
                'واحد',
                'رقم قبلی',
                'رقم فعلی',
                'میزان مصرف',
                'مبلغ سهم واحد (تومان)'
            ]);

            calculation.rows.forEach(row => {
                data.push([
                    row.unit,
                    row.previous,
                    row.current,
                    row.consumption,
                    cleanNumber(row.amount)
                ]);
            });
        }

        data.push([]);
        data.push([]);

        // عنوان جدول دوم
        data.push([
            'اطلاعات قبض و خلاصه محاسبات'
        ]);

        // =====================================================
        // روش اول
        // =====================================================

        if (isSubMeterMode) {

            data.push([
                'دوره قبض',
                `${period.start} - ${period.end} ${formatDaysWithParentheses(period.days)}`,
                'مجموع مبلغ قبوض (تومان)',
                cleanNumber(bills.total)
            ]);

            data.push([
                'روش محاسبه',
                methodName,
                'مجموع مصرف',
                cleanNumber(calculation.totalConsumption)
            ]);

            data.push([
                'مهلت پرداخت',
                deadline,
                'شماره کارت ساختمان',
                cardNumber
            ]);
        }

        // =====================================================
        // روش دوم
        // =====================================================

        else if (isMainMeterMode) {

            data.push([
                'دوره قبض',
                `${period.start} - ${period.end}`,
                'تعداد روز',
                cleanNumber(period.days)
            ]);

            data.push([
                'مجموع مبلغ قبوض (تومان)',
                cleanNumber(bills.total),
                'روش محاسبه',
                methodName
            ]);

            data.push([
                'مجموع مصرف کنتورهای فرعی',
                cleanNumber(calculation.totalConsumption),
                'مجموع مصرف کنتورهای اصلی',
                cleanNumber(calculation.mainMeter)
            ]);

            data.push([
                'باقی‌مانده تقسیم شده (تومان)',
                cleanNumber(calculation.remainder),
                'سهم باقی‌مانده هر واحد (تومان)',
                cleanNumber(calculation.equalShare)
            ]);

            data.push([
                'مهلت پرداخت',
                deadline,
                'شماره کارت ساختمان',
                cardNumber
            ]);
        }

        // =====================================================
        // روش سوم
        // =====================================================

        else if (isPeopleMode) {

            data.push([
                'دوره قبض',
                `${period.start} - ${period.end}`,
                'تعداد روز',
                cleanNumber(period.days)
            ]);

            data.push([
                'مجموع مبلغ قبوض (تومان)',
                cleanNumber(bills.total),
                'روش محاسبه',
                methodName
            ]);

            data.push([
                'تعداد کل نفرات',
                cleanNumber(calculation.totalPeople),
                'سهم هر نفر (تومان)',
                calculation.totalPeople > 0
                    ? cleanNumber(
                        calculation.billAmount /
                        calculation.totalPeople
                    )
                    : 0
            ]);

            data.push([
                'مهلت پرداخت',
                deadline,
                'شماره کارت ساختمان',
                cardNumber
            ]);
        }

        // =====================================================
        // تعداد ردیف‌های جدول دوم
        // =====================================================

        const summaryRows =
            isSubMeterMode
                ? 3
                : isMainMeterMode
                    ? 5
                    : 4;

        // =====================================================
        // Worksheet
        // =====================================================

        const worksheet =
            XLSX.utils.aoa_to_sheet(data);

        // =====================================================
        // رنگ‌ها
        // =====================================================

        const colors = {
            primary: '3F8FA8',
            title: '356B5E',
            summaryHeader: 'D7ECE5',
            summaryLabel: 'EAF6F2',
            summaryValue: 'F7FBF9',
            notesBackground: 'FBFDFC',
            border: '7F9298',
            text: '263238',
            white: 'FFFFFF'
        };

        // =====================================================
        // Border
        // =====================================================

        const border = {
            top: {
                style: 'medium',
                color: { rgb: colors.border }
            },
            bottom: {
                style: 'medium',
                color: { rgb: colors.border }
            },
            left: {
                style: 'medium',
                color: { rgb: colors.border }
            },
            right: {
                style: 'medium',
                color: { rgb: colors.border }
            }
        };

        // =====================================================
        // Style های پایه
        // =====================================================

        const normalStyle = {
            font: {
                name: 'Vazirmatn',
                sz: 10,
                color: { rgb: colors.text }
            },
            alignment: {
                horizontal: 'center',
                vertical: 'center',
                wrapText: true
            },
            border
        };

        const alternateStyle = {
            ...normalStyle,
            fill: {
                patternType: 'solid',
                fgColor: { rgb: 'F7FBFC' }
            }
        };

        const tableHeaderStyle = {
            font: {
                name: 'Vazirmatn',
                sz: 10,
                bold: true,
                color: { rgb: colors.white }
            },
            fill: {
                patternType: 'solid',
                fgColor: { rgb: colors.primary }
            },
            alignment: {
                horizontal: 'center',
                vertical: 'center',
                wrapText: true
            },
            border
        };

        const titleStyle = {
            font: {
                name: 'Vazirmatn',
                sz: 16,
                bold: true,
                color: { rgb: colors.title }
            },
            alignment: {
                horizontal: 'center',
                vertical: 'center'
            }
        };

        const summaryTitleStyle = {
            font: {
                name: 'Vazirmatn',
                sz: 11,
                bold: true,
                color: { rgb: colors.title }
            },
            fill: {
                patternType: 'solid',
                fgColor: { rgb: colors.summaryHeader }
            },
            alignment: {
                horizontal: 'center',
                vertical: 'center',
                wrapText: true
            },
            border
        };

        const summaryLabelStyle = {
            font: {
                name: 'Vazirmatn',
                sz: 10,
                bold: true,
                color: { rgb: colors.title }
            },
            fill: {
                patternType: 'solid',
                fgColor: { rgb: colors.summaryLabel }
            },
            alignment: {
                horizontal: 'center',
                vertical: 'center',
                wrapText: true
            },
            border
        };

        const summaryValueStyle = {
            font: {
                name: 'Vazirmatn',
                sz: 10,
                color: { rgb: colors.text }
            },
            fill: {
                patternType: 'solid',
                fgColor: { rgb: colors.summaryValue }
            },
            alignment: {
                horizontal: 'center',
                vertical: 'center',
                wrapText: true
            },
            border
        };

        const notesStyle = {
            font: {
                name: 'Vazirmatn',
                sz: 10,
                color: { rgb: colors.text }
            },
            fill: {
                patternType: 'solid',
                fgColor: { rgb: colors.notesBackground }
            },
            alignment: {
                horizontal: 'right',
                vertical: 'top',
                wrapText: true
            },
            border
        };

        // =====================================================
        // عنوان اصلی
        // =====================================================

        worksheet['A1'].s = titleStyle;

        const tableColumns =
            isPeopleMode ? 3 : 5;

        worksheet['!merges'] = [
            {
                s: { r: 0, c: 0 },
                e: {
                    r: 0,
                    c: tableColumns - 1
                }
            }
        ];

        // =====================================================
        // استایل جدول اصلی
        // =====================================================

        const tableHeaderRow = 3;

        for (
            let col = 0;
            col < tableColumns;
            col++
        ) {

            const cell =
                XLSX.utils.encode_cell({
                    r: tableHeaderRow - 1,
                    c: col
                });

            if (worksheet[cell]) {
                worksheet[cell].s =
                    tableHeaderStyle;
            }
        }

        const tableStartRow = 4;

        const tableEndRow =
            tableStartRow +
            calculation.rows.length -
            1;

        for (
            let row = tableStartRow;
            row <= tableEndRow;
            row++
        ) {

            const rowStyle =
                ((row - tableStartRow) % 2 === 1)
                    ? alternateStyle
                    : normalStyle;

            for (
                let col = 0;
                col < tableColumns;
                col++
            ) {

                const cell =
                    XLSX.utils.encode_cell({
                        r: row - 1,
                        c: col
                    });

                if (worksheet[cell]) {
                    worksheet[cell].s = rowStyle;
                }
            }

            const amountColumn =
    isPeopleMode ? 2 : 4;

for (
    let col = 0;
    col < tableColumns;
    col++
) {

    const cell =
        XLSX.utils.encode_cell({
            r: row - 1,
            c: col
        });

    if (!worksheet[cell]) {
        continue;
    }

    if (col === amountColumn) {
        // مبلغ → با جداکننده هزارگان
        worksheet[cell].z = '#,##0';
    } else {
        // شماره واحد، کنتور، مصرف و تعداد نفرات
        // → بدون جداکننده هزارگان
        worksheet[cell].z = '0';
    }
}
        }

        // =====================================================
        // محل جدول دوم
        // =====================================================

        const summaryTitleRow =
            tableEndRow + 3;

        const summaryStartRow =
            summaryTitleRow + 1;

        // عنوان
        worksheet[`A${summaryTitleRow}`] = {
    v: 'اطلاعات قبض و خلاصه محاسبات',
    t: 's',
    s: summaryTitleStyle
};

worksheet['!merges'].push({
    s: {
        r: summaryTitleRow - 1,
        c: 0
    },

    e: {
        r: summaryTitleRow - 1,
        c: 3
    }
});

// ایجاد سلول‌های عنوان برای کامل شدن کادر بالای جدول
worksheet[`B${summaryTitleRow}`] = {
    v: '',
    t: 's',
    s: summaryTitleStyle
};

worksheet[`C${summaryTitleRow}`] = {
    v: '',
    t: 's',
    s: summaryTitleStyle
};

worksheet[`D${summaryTitleRow}`] = {
    v: '',
    t: 's',
    s: summaryTitleStyle
};

        // =====================================================
        // ستون توضیحات E
        // =====================================================

        const notesColumn = 4;

        const notesHeaderCell =
            XLSX.utils.encode_cell({
                r: summaryTitleRow - 1,
                c: notesColumn
            });

        worksheet[notesHeaderCell] = {
            v: 'توضیحات',
            t: 's',
            s: summaryTitleStyle
        };

        // =====================================================
        // اطمینان از وجود سلول‌های جدول دوم
        // =====================================================

        for (
            let i = 0;
            i < summaryRows;
            i++
        ) {

            const row =
                summaryStartRow + i;

            [
                `A${row}`,
                `B${row}`,
                `C${row}`,
                `D${row}`
            ].forEach(cell => {

                if (!worksheet[cell]) {
                    worksheet[cell] = {
                        v: '',
                        t: 's',
                        s: summaryValueStyle
                    };
                }

            });

            worksheet[`A${row}`].s =
                summaryLabelStyle;

            worksheet[`C${row}`].s =
                summaryLabelStyle;

            worksheet[`B${row}`].s =
                summaryValueStyle;

            worksheet[`D${row}`].s =
                summaryValueStyle;
        }

        // =====================================================
        // فرمت عددی جدول دوم
        // =====================================================

        // این بخش مهم است:
        // مبلغ‌ها و اعداد عدد واقعی Excel باقی می‌مانند
        // و جداکننده هزارگان می‌گیرند.

        const formatSummaryNumber = (
    cellAddress,
    useThousandsSeparator = false
) => {

    if (
        worksheet[cellAddress] &&
        typeof worksheet[cellAddress].v === 'number'
    ) {

        worksheet[cellAddress].z =
            useThousandsSeparator
                ? '#,##0'
                : '0';
    }
};
for (
    let row = summaryStartRow;
    row < summaryStartRow + summaryRows;
    row++
) {

    // به‌صورت پیش‌فرض همه اعداد بدون جداکننده هستند.
    formatSummaryNumber(`B${row}`, false);
    formatSummaryNumber(`D${row}`, false);
}

// =====================================================
// فرمت مبالغ در جدول خلاصه
// فقط مبالغ → با جداکننده هزارگان
// =====================================================

const moneyCells = [];

if (isSubMeterMode) {
    // مجموع مبلغ قبوض
    moneyCells.push(`D${summaryStartRow}`);
}

if (isMainMeterMode) {
    // مجموع مبلغ قبوض
    moneyCells.push(`B${summaryStartRow + 1}`);

    // باقی‌مانده تقسیم شده
    moneyCells.push(`B${summaryStartRow + 3}`);

    // سهم باقی‌مانده هر واحد
    moneyCells.push(`D${summaryStartRow + 3}`);
}

if (isPeopleMode) {
    // مجموع مبلغ قبوض
    moneyCells.push(`B${summaryStartRow + 1}`);

    // سهم هر نفر
    moneyCells.push(`D${summaryStartRow + 2}`);
}

moneyCells.forEach(cellAddress => {
    formatSummaryNumber(cellAddress, true);
});

        // =====================================================
        // توضیحات
        // =====================================================

        const notesFirstRow =
            summaryStartRow;

        const notesLastRow =
            summaryStartRow +
            summaryRows -
            1;

        for (
            let row = notesFirstRow;
            row <= notesLastRow;
            row++
        ) {

            const cell =
                XLSX.utils.encode_cell({
                    r: row - 1,
                    c: notesColumn
                });

            worksheet[cell] = {
                v: '',
                t: 's',
                s: notesStyle
            };
        }

        const notesCell =
            XLSX.utils.encode_cell({
                r: notesFirstRow - 1,
                c: notesColumn
            });

        worksheet[notesCell] = {
            v: notes,
            t: 's',
            s: notesStyle
        };

        worksheet['!merges'].push({
            s: {
                r: notesFirstRow - 1,
                c: notesColumn
            },
            e: {
                r: notesLastRow - 1,
                c: notesColumn
            }
        });

        // =====================================================
        // محدوده Worksheet
        // =====================================================

        worksheet['!ref'] =
            XLSX.utils.encode_range({
                s: {
                    r: 0,
                    c: 0
                },
                e: {
                    r: notesLastRow - 1,
                    c: notesColumn
                }
            });

        // =====================================================
        // عرض ستون‌ها
        // =====================================================

        worksheet['!cols'] = [
            { wch: 18 },
            { wch: 27 },
            { wch: 29 },
            { wch: 31 },
            { wch: 42 }
        ];

        // =====================================================
        // ارتفاع ردیف‌ها
        // =====================================================

        worksheet['!rows'] = [];

        worksheet['!rows'][0] = {
            hpt: 36
        };

        worksheet['!rows'][1] = {
            hpt: 8
        };

        worksheet['!rows'][2] = {
            hpt: 32
        };

        // جدول اصلی
        for (
            let i = tableStartRow - 1;
            i <= tableEndRow - 1;
            i++
        ) {

            worksheet['!rows'][i] = {
                hpt: 26
            };
        }

        // عنوان جدول دوم
        worksheet['!rows'][
            summaryTitleRow - 1
        ] = {
            hpt: 30
        };

        // ردیف‌های جدول دوم
        for (
            let i = summaryStartRow - 1;
            i <
                summaryStartRow +
                summaryRows -
                1;
            i++
        ) {

            worksheet['!rows'][i] = {
                hpt: 32
            };
        }

        // افزایش ارتفاع توضیحات برای متن طولانی
        const charactersPerLine = 42;

        const estimatedLines =
            Math.max(
                1,
                Math.ceil(
                    notes.length /
                    charactersPerLine
                )
            );

        const requiredHeight =
            Math.max(
                32,
                Math.min(
                    300,
                    estimatedLines * 30
                )
            );

        const perRowHeight =
            Math.max(
                32,
                Math.ceil(
                    requiredHeight /
                    summaryRows
                )
            );

        for (
            let i = summaryStartRow - 1;
            i <
                summaryStartRow +
                summaryRows -
                1;
            i++
        ) {

            worksheet['!rows'][i] = {
                hpt: perRowHeight
            };
        }

        // =====================================================
        // RTL
        // =====================================================

        worksheet['!sheetViews'] = [
            {
                rightToLeft: true
            }
        ];

        // =====================================================
        // Workbook
        // =====================================================

        const workbook =
            XLSX.utils.book_new();

        workbook.Workbook = {
            Views: [
                {
                    RTL: true
                }
            ]
        };

        XLSX.utils.book_append_sheet(
            workbook,
            worksheet,
            'گزارش قبض'
        );

        // =====================================================
        // نام فایل
        // =====================================================

        const today = new Date();

        const fileName =
            `گزارش-قبض-آب-${today.getFullYear()}-${String(
                today.getMonth() + 1
            ).padStart(2, '0')}-${String(
                today.getDate()
            ).padStart(2, '0')}.xlsx`;

        // =====================================================
        // خروجی
        // =====================================================

        XLSX.writeFile(
            workbook,
            fileName
        );

    } catch (error) {

        console.error(
            'Excel generation error:',
            error
        );

        alert(
            'در ساخت فایل Excel مشکلی پیش آمد. دوباره تلاش کنید.'
        );
    }
}

function calculate() {
    if (!validateForm()) {
        result.innerHTML = '';

        // رفتن خودکار به اولین خطا
        scrollToFirstError();

        return;
    }

    try {
        const bills = getBillInfo();
        const period = periodDetails();

        let calculation;

        if (currentMode() === 'people') {

            calculation = calculateByPeople({
                billAmount: bills.total,
                people: getPeople()
            });

        } else if (currentMode() === 'main-meter') {

            calculation = calculateByMainMeter({
                billAmount: bills.total,
                mainMeter:
                    parseNumber($('mainMeter').value),
                readings:
                    getReadings(),
                excludeZeroConsumption:
                    $('excludeZeroConsumption').checked
            });

        } else {

            calculation = calculateBySubMeters({
                billAmount: bills.total,
                readings: getReadings()
            });
        }

        renderResult(
            calculation,
            bills,
            period
        );

    } catch (error) {

        result.innerHTML =
            `<p class="error-message">${escapeHtml(
                error.message
            )}</p>`;
    }

    result.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
    });
}

async function generatePDF() {
    if (typeof window.jspdf === 'undefined') {
        alert('کتابخانه PDF بارگذاری نشده است.');
        return;
    }

    if (typeof html2canvas === 'undefined') {
        alert('کتابخانه ساخت PDF بارگذاری نشده است.');
        return;
    }

    const report = document.getElementById('result');

    if (!report || !report.innerHTML.trim()) {
        alert('ابتدا قبض را محاسبه کنید.');
        return;
    }

    const pdfButton =
        document.getElementById('pdfBtnInside');

    const printButton =
        document.getElementById('printBtnInside');

    try {
        // =====================================================
        // جلوگیری از چند بار کلیک
        // =====================================================

        if (pdfButton) {
            pdfButton.disabled = true;
            pdfButton.textContent =
                '⏳ در حال ساخت PDF...';
        }

        // =====================================================
        // صبر برای آماده شدن فونت‌ها
        // =====================================================

        if (document.fonts && document.fonts.ready) {
            await document.fonts.ready;
        }

        // =====================================================
        // تنظیمات PDF
        // =====================================================

        const { jsPDF } = window.jspdf;

        const pageWidth = 210;
        const pageHeight = 297;

        const margin = 10;

        const contentWidth =
            pageWidth - (margin * 2);

        const contentHeight =
            pageHeight - (margin * 2);

        // =====================================================
        // ساخت نسخه پایه برای اندازه‌گیری
        // =====================================================

        const baseClone =
            report.cloneNode(true);

        baseClone.querySelectorAll(
            '.no-print'
        ).forEach(element => {
            element.remove();
        });

        baseClone.style.position = 'absolute';
        baseClone.style.left = '-100000px';
        baseClone.style.top = '0';

        // همان ابعاد نسخه قبلی
        baseClone.style.width = '794px';
        baseClone.style.minHeight = 'auto';
        baseClone.style.height = 'auto';

        baseClone.style.background = '#ffffff';
        baseClone.style.padding = '30px';
        baseClone.style.boxSizing = 'border-box';

        baseClone.style.border = 'none';
        baseClone.style.boxShadow = 'none';
        baseClone.style.borderRadius = '0';

        baseClone.style.direction = 'rtl';
        baseClone.style.overflow = 'visible';

        document.body.appendChild(baseClone);

        // =====================================================
        // پیدا کردن جدول
        // =====================================================

        const baseTable =
            baseClone.querySelector('table');

        if (!baseTable) {
            baseClone.remove();
            throw new Error(
                'جدول گزارش برای ساخت PDF پیدا نشد.'
            );
        }

        const tbody =
            baseTable.querySelector('tbody');

        const sourceRows =
            tbody
                ? [...tbody.querySelectorAll('tr')]
                : [];

        const rowCount =
            sourceRows.length;

        // =====================================================
        // ارتفاع قابل استفاده هر صفحه
        // بر اساس عرض واقعی PDF
        // =====================================================

        const renderedWidth =
            baseClone.scrollWidth;

        const printableHeightPx =
            renderedWidth *
            (contentHeight / contentWidth);

        // کمی فضای امن برای جلوگیری از برخورد
        // آخرین ردیف با پایین صفحه
        const safePageHeightPx =
            printableHeightPx - 25;

        // =====================================================
        // اندازه هدر جدول
        // =====================================================

        const thead =
            baseTable.querySelector('thead');

        const headerHeight =
            thead
                ? thead.getBoundingClientRect().height
                : 0;

        // =====================================================
        // اندازه ردیف‌ها
        // =====================================================

        const rowHeights =
            sourceRows.map(row =>
                row.getBoundingClientRect().height
            );

        // =====================================================
        // خلاصه اطلاعات پایین جدول
        // =====================================================

        const summary =
            baseClone.querySelector(
                '.result-summary'
            );

        const summaryHeight =
            summary
                ? summary.getBoundingClientRect().height
                : 0;

        // فاصله بین جدول و خلاصه
        const summaryGap = 20;

// =====================================================
// تعیین صفحات به صورت ترتیبی
//
// ردیف‌ها از ابتدای جدول به ترتیب وارد صفحات می‌شوند.
// صفحه اول و صفحات میانی تا حد ظرفیت پر می‌شوند.
// =====================================================

const pageChunks = [];

let currentChunk = [];
let currentHeight = headerHeight;

for (
    let i = 0;
    i < rowCount;
    i++
) {

    const rowHeight =
        rowHeights[i];

    if (
        currentChunk.length > 0 &&
        currentHeight + rowHeight >
        safePageHeightPx
    ) {

        pageChunks.push({
            rows: currentChunk,
            isLast: false
        });

        currentChunk = [];
        currentHeight = headerHeight;
    }

    currentChunk.push(i);
    currentHeight += rowHeight;
}

// آخرین بخش جدول
if (currentChunk.length > 0) {

    const lastChunkHeight =
        currentHeight +
        summaryGap +
        summaryHeight;

    // اگر جدول + خلاصه در همین صفحه جا می‌شوند،
    // همین صفحه آخر واقعی است.
    if (
        lastChunkHeight <=
        safePageHeightPx
    ) {

        pageChunks.push({
            rows: currentChunk,
            isLast: true
        });

    } else {

        // اگر خلاصه در این صفحه جا نشود،
        // ردیف‌های جدول در یک صفحه مستقل می‌مانند
        // و صفحه بعد فقط برای خلاصه ساخته می‌شود.

        pageChunks.push({
            rows: currentChunk,
            isLast: false
        });

        pageChunks.push({
            rows: [],
            isLast: true
        });
    }

} else {

    // حالت بدون ردیف
    pageChunks.push({
        rows: [],
        isLast: true
    });
}

        // =====================================================
        // حذف نسخه اندازه‌گیری
        // =====================================================

        baseClone.remove();

        // =====================================================
        // ساخت PDF
        // =====================================================

        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
            compress: true
        });

        // =====================================================
        // ساخت هر صفحه به صورت جداگانه
        // =====================================================

        for (
            let pageIndex = 0;
            pageIndex < pageChunks.length;
            pageIndex++
        ) {

            const chunk =
                pageChunks[pageIndex];

            // =================================================
            // ساخت Clone مخصوص این صفحه
            // =================================================

            const pageClone =
                report.cloneNode(true);

            pageClone.querySelectorAll(
                '.no-print'
            ).forEach(element => {
                element.remove();
            });

            pageClone.style.position = 'absolute';
            pageClone.style.left = '-100000px';
            pageClone.style.top = '0';

            pageClone.style.width = '794px';
            pageClone.style.minHeight = 'auto';
            pageClone.style.height = 'auto';

            pageClone.style.background = '#ffffff';
            pageClone.style.padding = '30px';
            pageClone.style.boxSizing = 'border-box';

            pageClone.style.border = 'none';
            pageClone.style.boxShadow = 'none';
            pageClone.style.borderRadius = '0';

            pageClone.style.direction = 'rtl';
            pageClone.style.overflow = 'visible';

            document.body.appendChild(pageClone);

            // =================================================
            // جدول صفحه
            // =================================================

            const pageTable =
                pageClone.querySelector('table');

            const pageBody =
                pageTable
                    ? pageTable.querySelector('tbody')
                    : null;

            if (pageBody) {

                const pageRows =
                    [...pageBody.querySelectorAll('tr')];

                pageRows.forEach(
                    (row, index) => {

                        if (
                            !chunk.rows.includes(index)
                        ) {
                            row.remove();
                        }
                    }
                );
            }

            // =================================================
            // خلاصه فقط روی آخرین صفحه
            // =================================================

            const pageSummary =
                pageClone.querySelector(
                    '.result-summary'
                );

            if (
                pageSummary &&
                !chunk.isLast
            ) {
                pageSummary.remove();
            }

            // =================================================
            // اگر صفحه آخر جدول ندارد،
            // جدول خالی حذف شود.
            // =================================================

            if (
                chunk.isLast &&
                chunk.rows.length === 0 &&
                pageTable
            ) {
                pageTable.remove();
            }

            // =================================================
            // زمان کوتاه برای Render
            // =================================================

            await new Promise(resolve =>
                setTimeout(resolve, 30)
            );

            // =================================================
            // تبدیل صفحه به Canvas
            // =================================================

            const canvas =
                await html2canvas(
                    pageClone,
                    {
                        scale: 2,
                        useCORS: true,
                        backgroundColor: '#ffffff',
                        logging: false,
                        width:
                            pageClone.scrollWidth,
                        height:
                            pageClone.scrollHeight
                    }
                );

            // =================================================
            // اضافه کردن صفحه به PDF
            // =================================================

            if (pageIndex > 0) {
                pdf.addPage();
            }

            const imageWidth =
                canvas.width;

            const imageHeight =
                canvas.height;

            const imageHeightInMM =
                (
                    imageHeight *
                    contentWidth
                ) /
                imageWidth;

            const imageData =
                canvas.toDataURL(
                    'image/jpeg',
                    0.95
                );

            // ارتفاع صفحه را از محدوده A4
            // بیشتر نکنیم
            const finalHeight =
                Math.min(
                    imageHeightInMM,
                    contentHeight
                );

            pdf.addImage(
                imageData,
                'JPEG',
                margin,
                margin,
                contentWidth,
                finalHeight
            );

            // =================================================
            // حذف Clone
            // =================================================

            pageClone.remove();
        }

        // =====================================================
        // نام فایل
        // =====================================================

        const today =
            new Date();

        const fileName =
            `قبض-آب-${today.getFullYear()}-${String(
                today.getMonth() + 1
            ).padStart(2, '0')}-${String(
                today.getDate()
            ).padStart(2, '0')}.pdf`;

        // =====================================================
        // ذخیره
        // =====================================================

        pdf.save(fileName);

    } catch (error) {

        console.error(
            'PDF generation error:',
            error
        );

        alert(
            'در ساخت فایل PDF مشکلی پیش آمد. دوباره تلاش کنید.'
        );

    } finally {

        // =====================================================
        // فعال کردن دوباره دکمه‌ها
        // =====================================================

        if (pdfButton) {
            pdfButton.disabled = false;
            pdfButton.textContent =
                '📄 دریافت PDF';
        }

        if (printButton) {
            printButton.disabled = false;
        }
    }
}

// ===== محدودیت ورود فقط عدد صحیح در فیلدهای عددی =====
document.querySelectorAll('input[type="number"]').forEach(input => {
    input.addEventListener('input', () => {
        input.value = input.value.replace(/[^\d۰-۹]/g, '');
    });
});

function allowOnlyDigits(input) {
    input.value = input.value.replace(/[^\d۰-۹]/g, '');
}

unitsTable.addEventListener('input', event => {
    if (
        event.target.matches(
            '.previous-reading, .current-reading, .people-value, .unit-number'
        )
    ) {
        allowOnlyDigits(event.target);

        if (
            event.target.classList.contains('people-value') &&
            event.target.value !== '' &&
            parseNumber(event.target.value) === 0
        ) {
            event.target.value = '';
        }
    }
});

// ===================== Event Listeners =====================
document.querySelectorAll('input[name="method"]').forEach(input => input.addEventListener('change', showMode));
unitCountInput.addEventListener('change', () => {
    const unitCount = parseNumber(unitCountInput.value);

    if (
        !Number.isInteger(unitCount) ||
        unitCount < 1 ||
        unitCount > 200
    ) {
        clearValidationErrors();

        showFieldError(
            unitCountInput,
            'تعداد واحدها باید بین ۱ تا ۲۰۰ باشد.'
        );

        return;
    }

    clearValidationErrors();
    createUnitsTable();
});
billAmountInput.addEventListener('input', () => formatMoneyInput(billAmountInput));
$('urgentPayment').addEventListener('change', setDeadlineState);
$('calculateBtn').addEventListener('click', calculate);
['periodStart', 'periodEnd', 'paymentDeadline'].forEach(setupJalaliDate);

disableScrollOnNumberInputs();
showMode();
setDeadlineState();
