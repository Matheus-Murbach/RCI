import { MapCell } from './mapCell.js';
import { RoomStructure } from './roomStructure.js';

export class MapGenerator {
    constructor(width = 100, height = 100) {
        this.width = width;
        this.height = height;
        this.grid = [];
        this.structures = [];
        this.initGrid();
        this.minStructures = 60;
        this.maxAttempts = 10;
    }

    initGrid() {
        console.log('🗺️ Iniciando geração do mapa...');
        for (let y = 0; y < this.height; y++) {
            this.grid[y] = [];
            for (let x = 0; x < this.width; x++) {
                this.grid[y][x] = new MapCell(x, y);
            }
        }
    }

    generateMap() {
        let attempts = 0;
        let success = false;

        while (!success && attempts < this.maxAttempts) {
            attempts++;
            console.log(`Tentativa ${attempts} de gerar mapa...`);
            
            // Limpar estruturas anteriores
            this.structures = [];
            this.initGrid();
            
            success = this.tryGenerateMap();
        }

        if (!success) {
            console.log('❌ Falha ao gerar mapa após', this.maxAttempts, 'tentativas');
        }
    }

    tryGenerateMap() {
        const hubX = Math.floor(this.width / 2) - 1;
        const hubY = Math.floor(this.height / 2) - 1;
        const hub = new RoomStructure(hubX, hubY, 3, 3, 'hub');
        this.placeStructure(hub);

        let roomsToProcess = [hub];
        let processedRooms = new Set();
        let totalStructures = 1;

        while (roomsToProcess.length > 0 && totalStructures < this.minStructures) {
            const currentRoom = roomsToProcess.shift();
            
            if (processedRooms.has(currentRoom.id)) continue;
            processedRooms.add(currentRoom.id);

            const remaining = this.minStructures - totalStructures;
            const numCorridors = remaining > 10 ? 4 : (2 + Math.floor(Math.random() * 2));
            
            for (let i = 0; i < numCorridors; i++) {
                const result = this.createCorridor(currentRoom);
                if (result) {
                    const { corridor, room } = result;
                    
                    this.placeStructure(corridor);
                    currentRoom.connections.push(corridor);
                    totalStructures++;

                    this.placeStructure(room);
                    corridor.connections.push(room);
                    roomsToProcess.push(room);
                    totalStructures++;
                }
            }
        }

        // Após gerar o mapa, analisar possíveis conexões alternativas
        this.analyzeRoomWalls();

        console.log(`📊 Total de estruturas: ${totalStructures}`);
        if (totalStructures >= this.minStructures) {
            console.log('✅ Geração do mapa concluída com sucesso!');
            this.printMap();
            return true;
        }

        return false;
    }

    analyzeRoomWalls() {
        console.log('🔍 Analisando paredes das salas...');
        const rooms = this.structures.filter(s => s.type === 'room' || s.type === 'hub');
        const connections = [];

        for (const room of rooms) {
            // Verificar cada lateral da sala
            const sides = this.getFreeSides(room);
            
            for (const [side, isFree] of Object.entries(sides)) {
                if (!isFree) continue; // Pular se já tem corredor

                const match = this.findNearbyWall(room, side);
                if (match) {
                    connections.push({ room1: room, room2: match.room, side, oppositeSide: match.side });
                }
            }
        }

        // Criar corredores alternativos
        for (const conn of connections) {
            this.createAlternativeCorridor(conn.room1, conn.room2, conn.side);
        }
    }

    getFreeSides(room) {
        const sides = { north: true, south: true, east: true, west: true };
        
        // Verificar corredores existentes
        for (const connection of room.connections) {
            if (connection.type !== 'hall') continue;
            
            if (connection.y < room.y) sides.north = false;
            if (connection.y > room.y) sides.south = false;
            if (connection.x < room.x) sides.west = false;
            if (connection.x > room.x) sides.east = false;
        }
        
        return sides;
    }

    findNearbyWall(room, side) {
        const MAX_DISTANCE = 6;
        const rooms = this.structures.filter(s => s.type === 'room' || s.type === 'hub');

        // Procurar em linha reta baseado no lado
        for (const other of rooms) {
            if (other === room) continue;

            switch(side) {
                case 'north':
                    if (Math.abs(other.x - room.x) <= 2 && // Alinhamento horizontal
                        other.y + other.height < room.y && // Está acima
                        room.y - (other.y + other.height) <= MAX_DISTANCE && // Dentro da distância
                        this.getFreeSides(other).south) { // Lado oposto livre
                        return { room: other, side: 'south' };
                    }
                    break;
                case 'south':
                    if (Math.abs(other.x - room.x) <= 2 &&
                        other.y > room.y + room.height &&
                        other.y - (room.y + room.height) <= MAX_DISTANCE &&
                        this.getFreeSides(other).north) {
                        return { room: other, side: 'north' };
                    }
                    break;
                case 'east':
                    if (Math.abs(other.y - room.y) <= 2 &&
                        other.x > room.x + room.width &&
                        other.x - (room.x + room.width) <= MAX_DISTANCE &&
                        this.getFreeSides(other).west) {
                        return { room: other, side: 'west' };
                    }
                    break;
                case 'west':
                    if (Math.abs(other.y - room.y) <= 2 &&
                        other.x + other.width < room.x &&
                        room.x - (other.x + other.width) <= MAX_DISTANCE &&
                        this.getFreeSides(other).east) {
                        return { room: other, side: 'east' };
                    }
                    break;
            }
        }

        return null;
    }

    createAlternativeCorridor(room1, room2, side) {
        let x, y, width, height;

        switch(side) {
            case 'north':
            case 'south':
                x = Math.min(room1.x, room2.x) + Math.floor(Math.max(room1.width, room2.width) / 2);
                y = Math.min(room1.y, room2.y + room2.height);
                width = 1;
                height = Math.abs(room1.y - (room2.y + room2.height));
                break;
            case 'east':
            case 'west':
                x = Math.min(room1.x + room1.width, room2.x);
                y = Math.min(room1.y, room2.y) + Math.floor(Math.max(room1.height, room2.height) / 2);
                width = Math.abs((room1.x + room1.width) - room2.x);
                height = 1;
                break;
        }

        const corridor = new RoomStructure(x, y, width, height, 'altHall');
        if (this.canPlaceStructure(corridor)) {
            this.placeStructure(corridor);
            room1.connections.push(corridor);
            room2.connections.push(corridor);
            console.log(`🚪 Corredor alternativo criado entre ${room1.id} e ${room2.id}`);
        }
    }

    createCorridor(startRoom) {
        const direction = Math.floor(Math.random() * 4);
        const length = 3 + Math.floor(Math.random() * 3); // Aumentado para 3-5
        const center = startRoom.getCenter();

        let x = center.x;
        let y = center.y;

        switch(direction) {
            case 0: // Norte
                x = center.x;
                y = startRoom.y - length;
                break;
            case 1: // Leste
                x = startRoom.x + startRoom.width;
                y = center.y;
                break;
            case 2: // Sul
                x = center.x;
                y = startRoom.y + startRoom.height;
                break;
            case 3: // Oeste
                x = startRoom.x - length;
                y = center.y;
                break;
        }

        const corridor = new RoomStructure(
            x,
            y,
            direction % 2 === 0 ? 1 : length,
            direction % 2 === 0 ? length : 1,
            'hall'
        );

        // Importante: criar e tentar posicionar a sala imediatamente
        if (this.canPlaceStructure(corridor)) {
            const room = this.createRoom(corridor, direction);
            if (room && this.canPlaceStructure(room)) {
                return { corridor, room };
            }
        }

        return null;
    }

    createRoom(corridor, direction) {
        const width = 3 + Math.floor(Math.random() * 3); // 3-5 largura
        const height = 3 + Math.floor(Math.random() * 3); // 3-5 altura
        let x, y;

        switch(direction) {
            case 0: // Norte - sala acima do corredor
                x = corridor.x - Math.floor(width/2) + 1;
                y = corridor.y - height;
                break;
            case 1: // Leste - sala à direita do corredor
                x = corridor.x + corridor.width;
                y = corridor.y - Math.floor(height/2) + 1;
                break;
            case 2: // Sul - sala abaixo do corredor
                x = corridor.x - Math.floor(width/2) + 1;
                y = corridor.y + corridor.height;
                break;
            case 3: // Oeste - sala à esquerda do corredor
                x = corridor.x - width;
                y = corridor.y - Math.floor(height/2) + 1;
                break;
        }

        return new RoomStructure(x, y, width, height, 'room');
    }

    generateHalls(startRoom) {
        const newStructures = [];
        const numHalls = Math.floor(Math.random() * 3) + 1; // 1-3 corredores

        for (let i = 0; i < numHalls; i++) {
            const direction = Math.floor(Math.random() * 4); // 0=N, 1=L, 2=S, 3=O
            const length = Math.floor(Math.random() * 4) + 1; // 1-4 de comprimento
            
            const hall = this.createHall(startRoom, direction, length);
            
            if (hall && this.canPlaceStructure(hall)) {
                this.placeStructure(hall);
                startRoom.connections.push(hall);
                
                // Criar sala no final do corredor
                const room = this.createRoomAtEnd(hall, direction);
                if (room && this.canPlaceStructure(room)) {
                    this.placeStructure(room);
                    hall.connections.push(room);
                    newStructures.push(room); // Adicionar sala para futuras expansões
                }
                
                newStructures.push(hall);
            }
        }

        return newStructures;
    }

    createHall(startRoom, direction, length) {
        const center = startRoom.getCenter();
        let hallX = center.x;
        let hallY = center.y;

        switch(direction) {
            case 0: // Norte
                hallY = startRoom.y - length;
                hallX = center.x;
                break;
            case 1: // Leste
                hallX = startRoom.x + startRoom.width;
                hallY = center.y;
                break;
            case 2: // Sul
                hallY = startRoom.y + startRoom.height;
                hallX = center.x;
                break;
            case 3: // Oeste
                hallX = startRoom.x - length;
                hallY = center.y;
                break;
        }

        return new RoomStructure(
            hallX,
            hallY,
            direction % 2 === 0 ? 1 : length,
            direction % 2 === 0 ? length : 1,
            'hall'
        );
    }

    createRoomAtEnd(hall, direction) {
        // Adicionar margem extra para garantir espaço
        const width = 2 + Math.floor(Math.random() * 4); // 2-5 largura
        const height = 2 + Math.floor(Math.random() * 4); // 2-5 altura
        let roomX, roomY;

        switch(direction) {
            case 0: // Norte
                roomX = hall.x - Math.floor(width / 2) + 1;
                roomY = hall.y - height - 1; // Adicionar margem
                break;
            case 1: // Leste
                roomX = hall.x + hall.width + 1; // Adicionar margem
                roomY = hall.y - Math.floor(height / 2) + 1;
                break;
            case 2: // Sul
                roomX = hall.x - Math.floor(width / 2) + 1;
                roomY = hall.y + hall.height + 1; // Adicionar margem
                break;
            case 3: // Oeste
                roomX = hall.x - width - 1; // Adicionar margem
                roomY = hall.y - Math.floor(height / 2) + 1;
                break;
        }

        return new RoomStructure(roomX, roomY, width, height, 'room');
    }

    generateRoomAtEnd(hall, direction) {
        const width = 2 + Math.floor(Math.random() * 5); // 2-6 largura
        const height = 2 + Math.floor(Math.random() * 5); // 2-6 altura
        let roomX, roomY;

        // Calcular posição da sala com base na direção do corredor
        switch(direction) {
            case 0: // Norte
                roomX = hall.x - Math.floor(width / 2) + 1;
                roomY = hall.y - height;
                break;
            case 1: // Leste
                roomX = hall.x + hall.width;
                roomY = hall.y - Math.floor(height / 2) + 1;
                break;
            case 2: // Sul
                roomX = hall.x - Math.floor(width / 2) + 1;
                roomY = hall.y + hall.height;
                break;
            case 3: // Oeste
                roomX = hall.x - width;
                roomY = hall.y - Math.floor(height / 2) + 1;
                break;
        }

        const room = new RoomStructure(roomX, roomY, width, height, 'room');
        
        if (this.canPlaceStructure(room)) {
            this.placeStructure(room);
            hall.connections.push(room);
            console.log(`🏠 Sala criada: ${width}x${height} em (${roomX},${roomY})`);
        }
    }

    generateRooms() {
        const halls = this.structures.filter(s => s.type === 'hall');
        console.log(`🏗️ Gerando salas para ${halls.length} corredores...`);

        halls.forEach(hall => {
            const width = 2 + Math.floor(Math.random() * 5); // 2-6 largura
            const height = 2 + Math.floor(Math.random() * 5); // 2-6 altura
            
            // Determinar a posição da sala baseada na orientação do corredor
            const isVerticalHall = hall.height > hall.width;
            let roomX, roomY;

            if (isVerticalHall) {
                roomX = hall.x - Math.floor((width - 1) / 2);
                roomY = hall.y + (hall.height * (Math.random() > 0.5 ? 1 : -1));
            } else {
                roomX = hall.x + (hall.width * (Math.random() > 0.5 ? 1 : -1));
                roomY = hall.y - Math.floor((height - 1) / 2);
            }

            const room = new RoomStructure(roomX, roomY, width, height, 'room');
            
            // Verificar se a sala está adjacente ao corredor e dentro dos limites
            if (this.canPlaceStructure(room) && this.isAdjacentToHall(room, hall)) {
                this.placeStructure(room);
                hall.connections.push(room);
                console.log(`🏠 Sala criada: ${width}x${height} em (${roomX},${roomY})`);
            }
        });
    }

    isAdjacentToHall(room, hall) {
        // Verificar se a sala está adjacente ao corredor
        const roomCenter = room.getCenter();
        const hallCenter = hall.getCenter();
        const distance = Math.abs(roomCenter.x - hallCenter.x) + Math.abs(roomCenter.y - hallCenter.y);
        
        return distance <= (hall.width + hall.height);
    }

    canPlaceStructure(structure) {
        if (structure.x < 0 || structure.y < 0 || 
            structure.x + structure.width > this.width || 
            structure.y + structure.height > this.height) {
            return false;
        }

        if (structure.type === 'room' || structure.type === 'hub') {
            for (let y = structure.y - 1; y <= structure.y + structure.height; y++) {
                for (let x = structure.x - 1; x <= structure.x + structure.width; x++) {
                    if (!this.grid[y] || !this.grid[y][x]) continue;
                    const cell = this.grid[y][x];
                    if (cell.type !== 'empty' && cell.type !== 'hall') {
                        return false;
                    }
                }
            }
            return true;
        }

        for (let y = structure.y; y < structure.y + structure.height; y++) {
            for (let x = structure.x; x < structure.x + structure.width; x++) {
                if (!this.grid[y] || !this.grid[y][x]) continue;
                const cell = this.grid[y][x];
                if (cell.type !== 'empty' && cell.type !== 'hall') {
                    return false;
                }
            }
        }
        return true;
    }

    placeStructure(structure) {
        this.structures.push(structure);
        for (let y = structure.y; y < structure.y + structure.height; y++) {
            for (let x = structure.x; x < structure.x + structure.width; x++) {
                if (this.grid[y] && this.grid[y][x]) {
                    this.grid[y][x].setType(structure.type);
                    this.grid[y][x].roomId = structure.id;
                }
            }
        }
    }

    printMap() {
        console.log('🗺️ Visualização do Mapa:');
        let mapString = '';
        for (let y = 0; y < this.height; y++) {
            let row = '';
            for (let x = 0; x < this.width; x++) {
                row += this.grid[y][x].symbol;
            }
            mapString += row + '\n';
        }
        console.log(mapString);
    }
}
