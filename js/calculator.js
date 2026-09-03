/* منطق محاسبات؛ مستقل از رابط کاربری */

function ensurePositive(value, message) {
    if (!Number.isFinite(value) || value <= 0) throw new Error(message);
}

function exactAmounts(rawAmounts, billAmount) {
    const totalRaw = rawAmounts.reduce((sum, val) => sum + val, 0);
    if (totalRaw === 0) return rawAmounts.map(() => 0);
    
    const amounts = rawAmounts.map(value => Math.round(value));
    let diff = Math.round(billAmount) - amounts.reduce((sum, val) => sum + val, 0);
    
    const fractions = rawAmounts.map((value, index) => ({
        index,
        fraction: value - Math.floor(value)
    }));
    fractions.sort((a, b) => b.fraction - a.fraction);
    
    let i = 0;
    while (diff > 0 && i < fractions.length) {
        amounts[fractions[i].index] += 1;
        diff--;
        i++;
    }
    while (diff < 0 && i < fractions.length) {
        amounts[fractions[i].index] -= 1;
        diff++;
        i++;
    }
    
    return amounts;
}

function validateReadings(readings) {
    if (!Array.isArray(readings) || readings.length === 0) throw new Error('اطلاعات واحدها را وارد کنید.');
    const validReadings = readings.map((reading, index) => {
        const unit = Number(reading.unit);
        const previous = Number(reading.previous);
        const current = Number(reading.current);
        if (!Number.isInteger(unit) || unit <= 0) throw new Error(`شماره واحد ${index + 1} معتبر نیست.`);
        if (!Number.isFinite(previous) || previous < 0 || !Number.isFinite(current) || current < 0) {
            throw new Error(`رقم قبلی و فعلی واحد ${index + 1} معتبر نیست.`);
        }
        if (current < previous) throw new Error(`رقم فعلی واحد ${index + 1} نمی‌تواند کمتر از رقم قبلی باشد.`);
        return { unit, previous, current, consumption: current - previous };
    });
    if (new Set(validReadings.map(reading => reading.unit)).size !== validReadings.length) throw new Error('شماره واحدها نباید تکراری باشند.');
    return validReadings;
}

function createMeterResult({ billAmount, readings, rawAmounts, method }) {
    const amounts = exactAmounts(rawAmounts, billAmount);
    const totalConsumption = readings.reduce((sum, reading) => sum + reading.consumption, 0);
    return {
        billAmount: Math.round(billAmount), method, totalConsumption,
        rows: readings.map((reading, index) => ({ ...reading, amount: amounts[index] })),
        totalAmount: amounts.reduce((sum, amount) => sum + amount, 0)
    };
}

function calculateBySubMeters({ billAmount, readings }) {
    ensurePositive(billAmount, 'مبلغ قبوض باید بیشتر از صفر باشد.');
    const validReadings = validateReadings(readings);
    const totalConsumption = validReadings.reduce((sum, reading) => sum + reading.consumption, 0);
    ensurePositive(totalConsumption, 'مجموع مصرف واحدها باید بیشتر از صفر باشد.');
    return createMeterResult({
        billAmount, readings: validReadings,
        rawAmounts: validReadings.map(reading => billAmount * reading.consumption / totalConsumption),
        method: 'تقسیم کل مبلغ بر اساس مجموع مصرف فرعی'
    });
}

function calculateByMainMeter({
    billAmount,
    mainMeter,
    readings,
    excludeZeroConsumption = false
}) {
    ensurePositive(
        billAmount,
        'مبلغ قبوض باید بیشتر از صفر باشد.'
    );

    ensurePositive(
        mainMeter,
        'مجموع مصرف کنتورهای اصلی باید بیشتر از صفر باشد.'
    );

    const validReadings =
        validateReadings(readings);

    const totalConsumption =
        validReadings.reduce(
            (sum, reading) =>
                sum + reading.consumption,
            0
        );

    ensurePositive(
        totalConsumption,
        'مجموع مصرف واحدها باید بیشتر از صفر باشد.'
    );

    if (totalConsumption > mainMeter) {
        throw new Error(
            'مجموع مصرف فرعی نمی‌تواند از مصرف کنتورهای اصلی بیشتر باشد.'
        );
    }

    // =====================================================
    // واحدهای مشمول تقسیم
    // =====================================================

    const eligibleReadings =
        excludeZeroConsumption
            ? validReadings.filter(
                reading =>
                    reading.consumption > 0
            )
            : validReadings;

    // اگر گزینه فعال باشد ولی همه واحدها مصرف صفر داشته باشند
    if (eligibleReadings.length === 0) {
        throw new Error(
            'هیچ واحدی مصرف ندارد و امکان تقسیم هزینه وجود ندارد.'
        );
    }

    // =====================================================
    // مبلغ اولیه هر واحد بر اساس کنتور اصلی
    // =====================================================

    const initialAmounts =
        validReadings.map(reading => {

            return (
                billAmount *
                reading.consumption /
                mainMeter
            );
        });

    // =====================================================
    // باقی‌مانده قبض
    // =====================================================

    const remainder =
        billAmount -
        initialAmounts.reduce(
            (sum, amount) =>
                sum + amount,
            0
        );

    // =====================================================
    // سهم مساوی باقی‌مانده
    // فقط بین واحدهای واجد شرایط
    // =====================================================

    const equalShare =
        remainder /
        eligibleReadings.length;

    // =====================================================
    // مبلغ نهایی هر واحد
    // =====================================================

    const rawAmounts =
        validReadings.map(reading => {

            const initialAmount =
                billAmount *
                reading.consumption /
                mainMeter;

            // واحد بدون مصرف در حالت حذف:
            if (
                excludeZeroConsumption &&
                reading.consumption === 0
            ) {
                return 0;
            }

            return (
                initialAmount +
                equalShare
            );
        });

    // =====================================================
    // گرد کردن نهایی
    // =====================================================

    const result =
        createMeterResult({
            billAmount,
            readings: validReadings,
            rawAmounts,
            method:
                excludeZeroConsumption
                    ? 'تقسیم با کنتور اصلی و تقسیم اختلاف بین واحدهای دارای مصرف'
                    : 'تقسیم با کنتور اصلی و تقسیم مساوی باقیمانده'
        });

    result.remainder =
        remainder;

    result.equalShare =
        equalShare;

    result.mainMeter =
        mainMeter;

    result.zeroConsumptionExcluded =
        excludeZeroConsumption;

    result.eligibleUnitCount =
        eligibleReadings.length;

    return result;
}

function calculateByPeople({ billAmount, people }) {
    ensurePositive(billAmount, 'مبلغ قبوض باید بیشتر از صفر باشد.');
    if (!Array.isArray(people) || people.some(item => !Number.isFinite(item.people) || item.people < 0 || !Number.isInteger(item.unit) || item.unit <= 0)) throw new Error('تعداد نفرات یا شماره واحد معتبر نیست.');
    if (new Set(people.map(item => item.unit)).size !== people.length) throw new Error('شماره واحدها نباید تکراری باشند.');
    const totalPeople = people.reduce((sum, item) => sum + item.people, 0);
    ensurePositive(totalPeople, 'تعداد کل نفرات باید بیشتر از صفر باشد.');
    const amounts = exactAmounts(people.map(item => billAmount * item.people / totalPeople), billAmount);
    return {
        billAmount: Math.round(billAmount), totalPeople, method: 'تقسیم مبلغ بر اساس تعداد نفرات',
        rows: people.map((item, index) => ({ unit: item.unit, people: item.people, amount: amounts[index] })),
        totalAmount: amounts.reduce((sum, amount) => sum + amount, 0)
    };
}
