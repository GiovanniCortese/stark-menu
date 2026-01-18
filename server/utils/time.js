const getNowItaly = () => {
    return new Date().toLocaleString('it-IT', { 
        timeZone: 'Europe/Rome',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
};

const getTimeItaly = () => {
    return new Date().toLocaleTimeString('it-IT', {
        timeZone: 'Europe/Rome',
        hour: '2-digit', minute: '2-digit'
    });
};

const getItalyDateComponents = () => {
    const now = new Date();
    const itTime = new Intl.DateTimeFormat('it-IT', {
        timeZone: 'Europe/Rome',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit'
    }).formatToParts(now);
    const parts = {};
    itTime.forEach(p => parts[p.type] = p.value);
    return parts;
};

module.exports = { getNowItaly, getTimeItaly, getItalyDateComponents };