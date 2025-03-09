export class RoomStructure {
    constructor(x, y, width, height, type) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.type = type;
        this.id = Math.random().toString(36).substr(2, 9);
        this.connections = [];
    }

    containsPoint(x, y) {
        return x >= this.x && 
               x < this.x + this.width && 
               y >= this.y && 
               y < this.y + this.height;
    }

    getCenter() {
        return {
            x: this.x + Math.floor(this.width / 2),
            y: this.y + Math.floor(this.height / 2)
        };
    }

    overlaps(other) {
        return !(this.x + this.width <= other.x || 
                other.x + other.width <= this.x || 
                this.y + this.height <= other.y || 
                other.y + other.height <= this.y);
    }
}
