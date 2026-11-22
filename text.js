module.exports = function removeDates(value) {
    return (value || '')
        .replace(/(?:更新於|更新于|創建於|创建于)\s*\d{4}[-/.]\d{1,2}[-/.]\d{1,2}(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?/gi, '')
        .replace(/\d{4}[-/.]\d{1,2}[-/.]\d{1,2}(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?/g, '')
        .replace(/\s*[，,]\s*/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim();
};
