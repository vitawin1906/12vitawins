const MAP: Record<string, string> = {
    а:'a', б:'b', в:'v', г:'g', д:'d', е:'e', ё:'e', ж:'zh', з:'z', и:'i', й:'y',
    к:'k', л:'l', м:'m', н:'n', о:'o', п:'p', р:'r', с:'s', т:'t', у:'u', ф:'f',
    х:'h', ц:'c', ч:'ch', ш:'sh', щ:'sch', ъ:'', ы:'y', ь:'', э:'e', ю:'yu', я:'ya',
    ' ':'-', '_':'-', '/':'-', '\\':'-', ',':'', '.':'', ':':'', ';':'', '\'':'', '"':'',
    '(':'', ')':'', '[':'', ']':'', '{':'', '}':'', '+':'', '*':'', '&':'', '%':'', '#':'', '@':'', '!':'', '?':'',
};

export function slugifyRu(input: string): string {
    const s = input.trim().toLowerCase();
    let out = '';
    for (const ch of s) {
        if (MAP[ch] !== undefined) out += MAP[ch];
        else if (/[a-z0-9-]/.test(ch)) out += ch;
        else if (/\s/.test(ch)) out += '-';
        // всё остальное — удаляем
    }
    // схлопываем повторяющиеся дефисы
    out = out.replace(/-+/g, '-');
    // убираем крайние дефисы
    out = out.replace(/^-+|-+$/g, '');
    return out || 'cat';
}
