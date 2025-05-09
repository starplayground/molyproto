// 定义快捷菜单选项接口
export interface ShortcutOption {
  id: string;
  name: string;
  description: string;
  execute: () => void;
}

// 快捷菜单提供者接口
export interface ShortcutProvider {
  getOptions(): ShortcutOption[];
}

// 创建一个默认的快捷菜单提供者
export class DefaultShortcutProvider implements ShortcutProvider {
  constructor(private executeCallbacks: Record<string, () => void> = {}) {}

  getOptions(): ShortcutOption[] {
    return [
      {
        id: 'option-a',
        name: 'A',
        description: '选项A功能',
        execute: this.executeCallbacks.a || (() => console.log('Option A executed'))
      },
      {
        id: 'option-b',
        name: 'B',
        description: '选项B功能',
        execute: this.executeCallbacks.b || (() => console.log('Option B executed'))
      },
      {
        id: 'option-c',
        name: 'C',
        description: '选项C功能',
        execute: this.executeCallbacks.c || (() => console.log('Option C executed'))
      }
    ];
  }
}