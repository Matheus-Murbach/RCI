export class MapCell {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.type = 'empty';
        this.roomId = null;
    }

    setType(type) {
        this.type = type;
    }

    get symbol() {
        switch(this.type) {
            case 'empty': return ' . ';
            case 'room': return '[X]';
            case 'hub': return '[H]';
            case 'hall': return '[(]';
            case 'altHall': return '[)]';
            default: return ' ? ';
        }
    }
}
