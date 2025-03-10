import { ScifiDungeonGenerator } from './themes/scifiDungeonGenerator.js';

export class DungeonThemeManager {
    constructor(scene) {
        this.scene = scene;
        this.currentTheme = null;
        this.camera = null;
    }

    createTheme(themeName) {
        try {
            switch(themeName.toLowerCase()) {
                case 'scifi':
                    this.currentTheme = new ScifiDungeonGenerator(this.scene);
                    if (this.camera) {
                        this.currentTheme.camera = this.camera;
                    }
                    break;
                default:
                    console.warn('⚠️ Tema não encontrado:', themeName);
                    this.currentTheme = new ScifiDungeonGenerator(this.scene);
            }
            return this.currentTheme;
        } catch (error) {
            console.error('❌ Erro ao criar tema:', error);
            return null;
        }
    }

    updateCamera(camera) {
        this.camera = camera;
        if (this.currentTheme) {
            this.currentTheme.camera = camera;
        }
    }

    async applyTheme(themeName, grid) {
        const theme = this.createTheme(themeName);
        if (theme && grid) {
            await theme.generateFromGrid(grid);
        }
    }
}
