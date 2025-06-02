import * as vscode from 'vscode';

/**
 * 日志级别枚举
 */
export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3
}

/**
 * 统一日志管理器
 * 提供统一的日志接口，支持多种输出方式和日志级别
 */
export class Logger {
    private static instance: Logger;
    private outputChannel: vscode.OutputChannel;
    private logLevel: LogLevel = LogLevel.INFO;
    private enableConsoleOutput: boolean = true;

    private constructor() {
        this.outputChannel = vscode.window.createOutputChannel('Java Properties Navigator');
    }

    /**
     * 获取日志管理器单例实例
     */
    public static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    /**
     * 初始化日志管理器
     */
    public initialize(): void {
        this.loadConfiguration();
        this.info('日志管理器已初始化');
    }

    /**
     * 加载配置
     */
    private loadConfiguration(): void {
        const config = vscode.workspace.getConfiguration('java-properties-navigator');
        const logLevelStr = config.get<string>('logLevel', 'INFO');
        this.enableConsoleOutput = config.get<boolean>('enableConsoleOutput', true);
        
        // 转换日志级别
        switch (logLevelStr.toUpperCase()) {
            case 'DEBUG':
                this.logLevel = LogLevel.DEBUG;
                break;
            case 'INFO':
                this.logLevel = LogLevel.INFO;
                break;
            case 'WARN':
                this.logLevel = LogLevel.WARN;
                break;
            case 'ERROR':
                this.logLevel = LogLevel.ERROR;
                break;
            default:
                this.logLevel = LogLevel.INFO;
        }
    }

    /**
     * 更新配置
     */
    public updateConfiguration(): void {
        this.loadConfiguration();
        this.info('日志配置已更新', { logLevel: LogLevel[this.logLevel], enableConsoleOutput: this.enableConsoleOutput });
    }

    /**
     * 记录调试信息
     */
    public debug(message: string, data?: any): void {
        this.log(LogLevel.DEBUG, message, data);
    }

    /**
     * 记录一般信息
     */
    public info(message: string, data?: any): void {
        this.log(LogLevel.INFO, message, data);
    }

    /**
     * 记录警告信息
     */
    public warn(message: string, data?: any): void {
        this.log(LogLevel.WARN, message, data);
    }

    /**
     * 记录错误信息
     */
    public error(message: string, error?: any, data?: any): void {
        let errorInfo = '';
        if (error) {
            if (error instanceof Error) {
                errorInfo = `\n错误详情: ${error.message}\n堆栈信息: ${error.stack}`;
            } else {
                errorInfo = `\n错误详情: ${JSON.stringify(error)}`;
            }
        }
        this.log(LogLevel.ERROR, message + errorInfo, data);
    }

    /**
     * 记录性能信息
     */
    public performance(operation: string, startTime: number, data?: any): void {
        const duration = Date.now() - startTime;
        this.info(`性能监控 - ${operation}`, { 
            duration: `${duration}ms`, 
            ...data 
        });
    }

    /**
     * 开始性能监控
     */
    public startPerformance(): number {
        return Date.now();
    }

    /**
     * 获取本地时间戳
     */
    private getLocalTimestamp(): string {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        const milliseconds = String(now.getMilliseconds()).padStart(3, '0');
        
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;
    }

    /**
     * 核心日志记录方法
     */
    private log(level: LogLevel, message: string, data?: any): void {
        // 检查日志级别
        if (level < this.logLevel) {
            return;
        }

        const timestamp = this.getLocalTimestamp();
        const levelStr = LogLevel[level];
        let logMessage = `[${timestamp}] [${levelStr}] ${message}`;

        // 添加数据信息
        if (data) {
            logMessage += `\n数据: ${JSON.stringify(data, null, 2)}`;
        }

        // 输出到输出通道
        this.outputChannel.appendLine(logMessage);

        // 输出到控制台（如果启用）
        if (this.enableConsoleOutput) {
            switch (level) {
                case LogLevel.DEBUG:
                    console.debug(logMessage);
                    break;
                case LogLevel.INFO:
                    console.log(logMessage);
                    break;
                case LogLevel.WARN:
                    console.warn(logMessage);
                    break;
                case LogLevel.ERROR:
                    console.error(logMessage);
                    break;
            }
        }
    }

    /**
     * 显示输出通道
     */
    public show(): void {
        this.outputChannel.show();
    }

    /**
     * 清空日志
     */
    public clear(): void {
        this.outputChannel.clear();
    }

    /**
     * 释放资源
     */
    public dispose(): void {
        this.outputChannel.dispose();
    }
} 