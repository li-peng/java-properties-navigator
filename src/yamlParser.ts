import * as vscode from 'vscode';
import * as YAML from 'yaml';
import { Pair, Scalar, YAMLMap, YAMLSeq, Node, LineCounter } from 'yaml'; // 显式导入需要的类型
import { ConfigItem } from './reader/configReader'; // 复用 ConfigItem 接口

/**
 * 尝试将 YAML 节点的值转换为适合 ConfigItem 的字符串表示
 */
function getNodeValueAsString(node: Node | null | undefined): any {
    if (node instanceof Scalar) {
        // 对于简单标量值，直接返回值
        return node.value;
    } else if (node instanceof YAMLMap || node instanceof YAMLSeq) {
        // 对于 Map 或 Sequence，可以返回其 JSON 字符串表示或 YAML 字符串表示
        // 这里选择 YAML 字符串表示，可能更符合预期
        return YAML.stringify(node);
    } else if (node === null || node === undefined) {
        return null; // 或者空字符串 ''，根据需要
    }
    // 其他未知类型或情况
    return String(node); 
}

/**
 * 解析 YAML 文件内容并提取键值对及其位置
 * @param content 文件内容字符串
 * @param fileUri 文件 URI
 * @returns 返回 ConfigItem 数组
 */
export function parseYaml(content: string, fileUri: vscode.Uri): ConfigItem[] {
    const items: ConfigItem[] = [];
    // 创建 LineCounter 实例
    const lineCounter = new LineCounter();
    try {
        // 在解析前手动填充 LineCounter
        for (let i = 0; i < content.length; i++) {
            if (content[i] === '\n') {
                // addNewLine 需要换行符 *之后* 的偏移量
                lineCounter.addNewLine(i + 1);
            }
        }

        const doc = YAML.parseDocument(content, { keepSourceTokens: true });

        if (doc.errors.length > 0) {
            console.warn(`解析 YAML 文件 ${fileUri.fsPath} 时发现错误:`, doc.errors);
            // 可以选择只记录错误或部分解析，这里我们继续尝试解析有效部分
        }

        YAML.visit(doc, {
            // 修正 key 的类型
            Pair: (key: number | 'key' | 'value' | null, node: Pair, path: readonly any[]) => {
                // 检查 node.key 是否为 Scalar 且有 range 属性
                if (node.key instanceof Scalar && node.key.range) { 
                    const keyNode = node.key;
                    // 直接使用 keyNode.range
                    const rangeTuple = keyNode.range; 

                    // 确保 rangeTuple 是有效的 [start, value_end, node_end?] 数组
                    // 我们只需要前两个元素
                    if (Array.isArray(rangeTuple) && rangeTuple.length >= 2 && 
                        typeof rangeTuple[0] === 'number' && typeof rangeTuple[1] === 'number') {
                        
                        const startOffset = rangeTuple[0];
                        const endOffset = rangeTuple[1]; // 使用第二个元素作为结束偏移量
                        const keyLength = endOffset - startOffset;

                        // 构建键路径 (与之前逻辑相同)
                        const keyParts: string[] = [];
                        const parentPath = path.slice(1);
                        for (const p of parentPath) {
                            if (p instanceof Pair && p.key instanceof Scalar) {
                                keyParts.push(String(p.key.value));
                            }
                        }
                        keyParts.push(String(keyNode.value));
                        const flatKey = keyParts.join('.');
                        
                        if (keyLength >= 0) {
                            // 使用手动填充的 lineCounter
                            const start = lineCounter.linePos(startOffset);
                            const end = lineCounter.linePos(endOffset);

                            if (start && end) {
                                const keyRange = new vscode.Range(
                                    // 1-based to 0-based
                                    new vscode.Position(start.line - 1, start.col - 1),
                                    new vscode.Position(end.line - 1, end.col - 1)
                                );

                                items.push({
                                    key: flatKey,
                                    value: getNodeValueAsString(node.value as Node | null),
                                    filePath: fileUri.fsPath,
                                    line: keyRange.start.line,
                                    column: keyRange.start.character,
                                    length: keyLength,
                                    fileType: 'yaml'
                                });
                            } else {
                                console.warn(`无法获取键 "${flatKey}" 在 ${fileUri.fsPath} 的行列号信息 (offset: ${startOffset})`);
                            }
                        } else {
                             console.warn(`无法获取键 "${flatKey}" 在 ${fileUri.fsPath} 的有效范围 (range: ${rangeTuple})`);
                        }
                    } else {
                         console.warn(`无法获取键 "${String(keyNode.value)}" 在 ${fileUri.fsPath} 的有效范围信息 (range: ${rangeTuple})`);
                    }
                }
            },
        });

    } catch (error) {
        // 捕获 YAML.parseDocument 可能抛出的更严重的解析错误
        console.error(`处理 YAML 文件 ${fileUri.fsPath} 时发生严重错误:`, error);
    }

    return items;
} 