import { TagManager } from '../services/tagManager';
import { GameplayTag, TaggedPage } from '../types/gameplayTag';

// 获取DOM元素
const newTagNameInput = document.getElementById('newTagName') as HTMLInputElement;
const createTagBtn = document.getElementById('createTagBtn') as HTMLButtonElement;
const currentPageTags = document.getElementById('currentPageTags') as HTMLDivElement;
const currentPageTitle = document.getElementById('currentPageTitle') as HTMLDivElement;
const statusElement = document.getElementById('status') as HTMLDivElement;
const clearCacheBtn = document.getElementById('clearCacheBtn') as HTMLButtonElement;
const debugStorageBtn = document.getElementById('debugStorageBtn') as HTMLButtonElement;
const cleanupTagsBtn = document.getElementById('cleanupTagsBtn') as HTMLButtonElement;
const autocompleteDropdown = document.getElementById('autocompleteDropdown') as HTMLDivElement;

// 模式切换相关元素
const modeTitle = document.getElementById('modeTitle') as HTMLHeadingElement;
const taggingMode = document.getElementById('taggingMode') as HTMLDivElement;
const taggedMode = document.getElementById('taggedMode') as HTMLDivElement;
const tagFilterInput = document.getElementById('tagFilterInput') as HTMLInputElement;
const tagFilterDropdown = document.getElementById('tagFilterDropdown') as HTMLDivElement;
const filteredPagesList = document.getElementById('filteredPagesList') as HTMLDivElement;

// 初始化
const tagManager = TagManager.getInstance();
let currentPage: TaggedPage | null = null;

// 模式管理
enum AppMode {
    TAGGING = 'tagging',
    TAGGED = 'tagged'
}

class ModeManager {
    private static currentMode: AppMode = AppMode.TAGGING;
    private static readonly STORAGE_KEY = 'app_mode';

    static async init() {
        // 标题点击切换模式
        modeTitle.addEventListener('click', async () => {
            await this.toggleMode();
        });

        // 从存储中加载上次的模式
        await this.loadModeFromStorage();
    }

    private static async loadModeFromStorage() {
        try {
            const result = await chrome.storage.local.get([this.STORAGE_KEY]);
            const savedMode = result[this.STORAGE_KEY] as AppMode;
            
            console.log('从存储加载模式:', { savedMode, availableModes: Object.values(AppMode) });
            
            if (savedMode && Object.values(AppMode).includes(savedMode)) {
                console.log('使用保存的模式:', savedMode);
                await this.setMode(savedMode);
            } else {
                console.log('使用默认模式: TAGGING');
                await this.setMode(AppMode.TAGGING);
            }
        } catch (error) {
            console.error('加载模式失败:', error);
            await this.setMode(AppMode.TAGGING);
        }
    }

    private static async saveModeToStorage() {
        try {
            await chrome.storage.local.set({ [this.STORAGE_KEY]: this.currentMode });
            console.log('模式已保存到存储:', this.currentMode);
        } catch (error) {
            console.error('保存模式失败:', error);
        }
    }

    static async toggleMode() {
        const newMode = this.currentMode === AppMode.TAGGING ? AppMode.TAGGED : AppMode.TAGGING;
        await this.setMode(newMode);
    }

    static async setMode(mode: AppMode) {
        this.currentMode = mode;
        
        // 保存模式到存储
        await this.saveModeToStorage();
        
        if (mode === AppMode.TAGGING) {
            modeTitle.textContent = 'Tagging';
            taggingMode.style.display = 'block';
            taggedMode.style.display = 'none';
        } else {
            modeTitle.textContent = 'Tagged';
            taggingMode.style.display = 'none';
            taggedMode.style.display = 'block';
            
            // 切换到浏览模式时，重新加载数据并显示所有页面
            await tagManager.reloadFromStorage();
            this.loadAllTaggedPages();
        }
    }

    static getCurrentMode(): AppMode {
        return this.currentMode;
    }

    static loadAllTaggedPages() {
        const allPages = tagManager.getTaggedPages();
        this.displayFilteredPages(allPages);
    }

    static filterPagesByTag(tagName: string) {
        const allTags = tagManager.getAllTags();
        const selectedTag = allTags.find(tag => 
            tag.name.toLowerCase() === tagName.toLowerCase() || 
            tag.fullName.toLowerCase() === tagName.toLowerCase()
        );

        if (!selectedTag) {
            this.displayFilteredPages([]);
            return;
        }

        // 获取该标签及其所有子标签的页面
        const pages = tagManager.getTaggedPages(selectedTag.id);
        this.displayFilteredPages(pages);
    }

    private static displayFilteredPages(pages: TaggedPage[]) {
        filteredPagesList.innerHTML = '';
        
        if (pages.length === 0) {
            filteredPagesList.innerHTML = '<div style="text-align: center; opacity: 0.7; padding: 20px;">暂无匹配的页面</div>';
            return;
        }

        pages.forEach(page => {
            const pageElement = this.createPageElement(page);
            filteredPagesList.appendChild(pageElement);
        });
    }

    private static createPageElement(page: TaggedPage): HTMLDivElement {
        const pageElement = document.createElement('div');
        pageElement.className = 'page-item';
        
        // 获取页面的标签信息
        const allTags = tagManager.getAllTags();
        const pageTags = allTags.filter(tag => page.tags.includes(tag.id));
        
        // 创建默认图标 - 使用简单的数据URI
        const defaultIcon = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJ3aGl0ZSI+PHBhdGggZD0iTTEyIDJDNi40OCAyIDIgNi40OCAyIDEyczQuNDggMTAgMTAgMTAgMTAtNC40OCAxMC0xMFMxNy41MiAyIDEyIDJ6bS0yIDE1bC01LTUgMS40MS0xLjQxTDEwIDE0LjE3bDcuNTktNy41OUwxOSA4bC05IDl6Ii8+PC9zdmc+';
        
        // 创建图标元素
        const faviconImg = document.createElement('img');
        faviconImg.className = 'page-favicon';
        faviconImg.src = page.favicon || defaultIcon;
        faviconImg.onerror = () => {
            faviconImg.src = defaultIcon;
        };
        
        // 创建内容容器
        const contentDiv = document.createElement('div');
        contentDiv.className = 'page-content';
        
        // 创建标题
        const titleDiv = document.createElement('div');
        titleDiv.className = 'page-item-title';
        titleDiv.textContent = page.title;
        
        // 创建URL
        const urlDiv = document.createElement('div');
        urlDiv.className = 'page-item-url';
        urlDiv.textContent = page.url;
        
        // 创建标签容器
        const tagsDiv = document.createElement('div');
        tagsDiv.className = 'page-tags';
        
        // 创建标签元素
        pageTags.forEach(tag => {
            const tagSpan = document.createElement('span');
            tagSpan.className = 'page-tag';
            tagSpan.textContent = tag.name;
            const color = tag.color || '#666666'; // 默认颜色
            tagSpan.style.backgroundColor = `${color}20`;
            tagSpan.style.borderColor = `${color}40`;
            tagSpan.style.color = color;
            tagsDiv.appendChild(tagSpan);
        });
        
        // 组装元素
        contentDiv.appendChild(titleDiv);
        contentDiv.appendChild(urlDiv);
        contentDiv.appendChild(tagsDiv);
        
        pageElement.appendChild(faviconImg);
        pageElement.appendChild(contentDiv);
        
        pageElement.addEventListener('click', () => {
            chrome.tabs.create({ url: page.url });
        });
        
        return pageElement;
    }
}

// 更新状态显示
function updateStatus(message: string, isError = false) {
    statusElement.textContent = message;
    statusElement.className = isError ? 'status error' : 'status';
}

// 页面更新辅助函数
class PageUpdateHelper {
    /**
     * 更新当前页面对象并重新加载显示
     */
    static async updateCurrentPageAndReload(): Promise<void> {
        if (currentPage) {
            const updatedPage = tagManager.getPageById(currentPage.id);
            if (updatedPage) {
                currentPage = updatedPage;
            }
        }
        await loadCurrentPageTags();
    }

    /**
     * 执行操作后更新页面和存储
     */
    static async executeWithPageUpdate<T>(
        operation: () => Promise<T>,
        syncStorage = true
    ): Promise<T> {
        const result = await operation();
        
        if (syncStorage) {
            await tagManager.syncToStorage();
        }
        
        await this.updateCurrentPageAndReload();
        return result;
    }
}

// 通用操作结果处理接口
interface OperationResult {
    success: boolean;
    message: string;
    isError?: boolean;
}

// 初始化辅助函数
class InitializationHelper {
    /**
     * 初始化所有事件监听器
     */
    static initEventListeners(): void {
        // 创建标签
        createTagBtn.addEventListener('click', EventHandlerHelper.createButtonHandler(
            async () => {
                const tagName = newTagNameInput.value.trim();
                return await OperationWrapper.executeCreateTag(tagName);
            },
            '正在创建标签...',
            '标签创建'
        ));

        // 回车键创建标签
        newTagNameInput.addEventListener('keypress', EventHandlerHelper.createEnterKeyHandler(createTagBtn));

        // 清空缓存
        clearCacheBtn.addEventListener('click', EventHandlerHelper.createConfirmButtonHandler(
            '确定要清空所有本地缓存数据吗？此操作不可撤销！',
            () => OperationWrapper.executeClearCache(),
            '正在清空缓存...',
            '缓存清空'
        ));

        // 标签筛选
        tagFilterInput.addEventListener('input', (e) => {
            const query = (e.target as HTMLInputElement).value.trim();
            if (query) {
                ModeManager.filterPagesByTag(query);
            } else {
                ModeManager.loadAllTaggedPages();
            }
        });

        tagFilterInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const query = (e.target as HTMLInputElement).value.trim();
                if (query) {
                    ModeManager.filterPagesByTag(query);
                }
            }
        });

        // 页面卸载和隐藏事件
        window.addEventListener('beforeunload', async () => {
            await ErrorHandler.executeWithErrorHandling(
                async () => {
                    // 清理未使用的标签
                    tagManager.cleanupUnusedTags();
                    // 同步到存储
                    await tagManager.syncToStorage();
                },
                '页面卸载时保存数据失败',
                '页面卸载'
            );
        });

        document.addEventListener('visibilitychange', async () => {
            if (document.hidden) {
                await ErrorHandler.executeWithErrorHandling(
                    async () => {
                        // 清理未使用的标签
                        tagManager.cleanupUnusedTags();
                        // 同步到存储
                        await tagManager.syncToStorage();
                    },
                    '页面隐藏时保存数据失败',
                    '页面隐藏'
                );
            }
        });

        // 调试存储状态
        debugStorageBtn.addEventListener('click', async () => {
            const result = await ErrorHandler.executeWithErrorHandling(
                async () => {
                    await OperationWrapper.executeDebugStorage();
                    const stats = tagManager.getDataStats();
                    return `调试信息已输出到控制台 - 内存: 标签${stats.tagsCount}, 页面${stats.pagesCount}`;
                },
                '获取存储状态失败',
                '存储状态调试'
            );
            
            if (result) {
                updateStatus(result);
            }
        });

        // 清理未使用标签
        cleanupTagsBtn.addEventListener('click', EventHandlerHelper.createConfirmButtonHandler(
            '确定要清理所有未使用的标签吗？此操作将删除没有被任何页面使用的标签。',
            async () => {
                const beforeStats = tagManager.getDataStats();
                tagManager.cleanupUnusedTags();
                const afterStats = tagManager.getDataStats();
                await tagManager.syncToStorage();
                
                const cleanedCount = beforeStats.tagsCount - afterStats.tagsCount;
                return { 
                    success: true, 
                    message: `清理完成，删除了 ${cleanedCount} 个未使用的标签` 
                };
            },
            '正在清理标签...',
            '标签清理'
        ));
    }
}

// 事件监听器辅助函数
class EventHandlerHelper {
    /**
     * 创建带状态更新的按钮点击事件处理器
     */
    static createButtonHandler(
        operation: () => Promise<OperationResult>,
        loadingMessage: string,
        context: string
    ): () => Promise<void> {
        return async () => {
            const result = await ErrorHandler.executeWithStatusUpdate(
                async () => {
                    const opResult = await operation();
                    return opResult.message;
                },
                loadingMessage,
                '', // 成功消息将在操作中设置
                `${context}失败`,
                context
            );
            
            if (result) {
                updateStatus(result);
            }
        };
    }

    /**
     * 创建确认对话框的按钮处理器
     */
    static createConfirmButtonHandler(
        confirmMessage: string,
        operation: () => Promise<OperationResult>,
        loadingMessage: string,
        context: string
    ): () => Promise<void> {
        return async () => {
            if (confirm(confirmMessage)) {
                const result = await ErrorHandler.executeWithStatusUpdate(
                    async () => {
                        const opResult = await operation();
                        return opResult.message;
                    },
                    loadingMessage,
                    '', // 成功消息将在操作中设置
                    `${context}失败`,
                    context
                );
                
                if (result) {
                    updateStatus(result);
                }
            }
        };
    }

    /**
     * 创建回车键事件处理器
     */
    static createEnterKeyHandler(button: HTMLButtonElement): (e: KeyboardEvent) => void {
        return (e: KeyboardEvent) => {
            if (e.key === 'Enter') {
                button.click();
            }
        };
    }
}

// 通用操作包装器
class OperationWrapper {
    /**
     * 通用Tag操作执行器
     * 统一处理所有Tag相关操作的通用逻辑：验证、执行、更新、同步
     */
    private static async executeTagOperationCore<T>(
        validate: () => Promise<{ valid: boolean; error?: string }>,
        operation: () => Promise<T>,
        onSuccess: (result: T) => Promise<void>,
        successMessage: string | ((result: T) => string),
        errorMessage: string
    ): Promise<OperationResult> {
        // 验证
        const validation = await validate();
        if (!validation.valid) {
            return { success: false, message: validation.error || errorMessage, isError: true };
        }

        try {
            // 执行操作
            const result = await operation();
            
            // 成功后处理
            await onSuccess(result);
            
            // 页面更新和存储同步
            await PageUpdateHelper.executeWithPageUpdate(async () => {
                // 操作已在上面执行，这里不需要额外操作
            });
            
            // 返回成功消息
            const message = typeof successMessage === 'function' 
                ? successMessage(result) 
                : successMessage;
            return { success: true, message };
        } catch (error) {
            console.error('操作执行失败:', error);
            return { success: false, message: errorMessage, isError: true };
        }
    }

    /**
     * 执行标签操作（添加/移除）的通用包装器
     */
    static async executeTagOperation(
        operation: 'add' | 'remove',
        tagId: string,
        successMessage: string,
        errorMessage: string
    ): Promise<OperationResult> {
        return this.executeTagOperationCore(
            // 验证
            async () => {
                if (!currentPage) {
                    return { valid: false, error: '当前页面为空' };
                }
                return { valid: true };
            },
            // 执行操作
            async () => {
                console.log(`${operation === 'add' ? '添加标签到页面' : '从页面移除标签'}:`, 
                           currentPage!.id, currentPage!.url, tagId);
                
                const success = operation === 'add' 
                    ? tagManager.addTagToPage(currentPage!.id, tagId)
                    : tagManager.removeTagFromPage(currentPage!.id, tagId);
                
                if (!success) {
                    throw new Error(`${operation === 'add' ? '添加' : '移除'}标签失败`);
                }
                
                return { success };
            },
            // 成功后处理
            async () => {
                // 操作已在上面执行，这里不需要额外操作
            },
            // 成功消息
            successMessage,
            // 错误消息
            errorMessage
        );
    }

    /**
     * 执行创建标签操作的通用包装器
     */
    static async executeCreateTag(tagName: string): Promise<OperationResult> {
        return this.executeTagOperationCore(
            // 验证
            async () => {
                if (!tagName.trim()) {
                    return { valid: false, error: '请输入标签名称' };
                }
                return { valid: true };
            },
            // 执行操作
            async () => {
                const newTag = tagManager.createTag(tagName);
                
                // 自动选中新创建的标签（添加到当前页面）
                if (currentPage) {
                    tagManager.addTagToPage(currentPage.id, newTag.id);
                }
                
                // 检查是否有父类标签需要合并
                await this.mergeParentTagsIfNeeded(newTag);
                
                return newTag;
            },
            // 成功后处理
            async () => {
                // 清空输入框
                newTagNameInput.value = '';
                // 重新加载当前页面标签
                if (currentPage) {
                    loadCurrentPageTags();
                }
            },
            // 成功消息
            (newTag) => `标签 "${newTag.name}" 已创建并自动选中`,
            // 错误消息
            '创建标签失败'
        );
    }

    /**
     * 检查并合并父类标签
     */
    private static async mergeParentTagsIfNeeded(newTag: GameplayTag): Promise<void> {
        if (!currentPage) return;
        
        // 获取当前页面的所有标签
        const currentPageTags = currentPage.tags || [];
        
        console.log('检查父类标签合并:', {
            newTagName: newTag.name,
            currentPageTags: currentPageTags.map(id => {
                const tag = tagManager.getTagById(id);
                return tag ? tag.name : 'unknown';
            })
        });
        
        // 查找可能的父类标签（标签名是当前标签名的前缀）
        const parentTags = currentPageTags.filter(tagId => {
            const tag = tagManager.getTagById(tagId);
            if (!tag) return false;
            
            // 检查是否是父类标签：父标签名是子标签名的前缀
            const isParent = newTag.name.startsWith(tag.name + '.') || 
                           (tag.name !== newTag.name && newTag.name.startsWith(tag.name));
            
            if (isParent) {
                console.log(`发现父类标签: ${tag.name} -> ${newTag.name}`);
            }
            
            return isParent;
        });
        
        // 如果有父类标签，将它们合并成子类
        for (const parentTagId of parentTags) {
            const parentTag = tagManager.getTagById(parentTagId);
            if (!parentTag) continue;
            
            console.log(`合并父类标签: ${parentTag.name} -> ${newTag.name}`);
            
            // 从当前页面移除父标签
            tagManager.removeTagFromPage(currentPage.id, parentTagId);
            
            // 将父标签设置为新标签的父标签
            if (newTag.parent !== parentTagId) {
                tagManager.updateTagParent(newTag.id, parentTagId);
                console.log(`已设置父标签关系: ${parentTag.name} -> ${newTag.name}`);
            }
        }
    }

    /**
     * 执行清空缓存操作的通用包装器
     */
    static async executeClearCache(): Promise<OperationResult> {
        try {
            await chrome.storage.local.clear();
            tagManager.clearAllData();
            await initializePage();
            return { success: true, message: '本地缓存已清空' };
        } catch (error) {
            console.error('清空缓存失败:', error);
            return { success: false, message: '清空缓存失败', isError: true };
        }
    }

    /**
     * 执行调试存储状态操作
     */
    static async executeDebugStorage(): Promise<void> {
        // 重新加载数据确保最新状态
        await tagManager.reloadFromStorage();
        
        const stats = tagManager.getDataStats();
        const allTags = tagManager.getAllTags();
        const allPages = tagManager.getTaggedPages();
        
        console.log('=== 存储状态调试信息 ===');
        console.log('内存中的标签数量:', stats.tagsCount);
        console.log('内存中的页面数量:', stats.pagesCount);
        console.log('所有标签:', allTags);
        console.log('所有页面:', allPages);
        
        // 检查Chrome存储
        const storageData = await chrome.storage.local.get(['gameplay_tags', 'tagged_pages']);
        console.log('Chrome存储数据:', storageData);
        console.log('存储中的标签数量:', Object.keys(storageData.gameplay_tags || {}).length);
        console.log('存储中的页面数量:', Object.keys(storageData.tagged_pages || {}).length);
        
        // 检查当前页面
        if (currentPage) {
            console.log('当前页面信息:', {
                id: currentPage.id,
                url: currentPage.url,
                title: currentPage.title,
                tags: currentPage.tags
            });
        }
        
        // 执行存储测试
        await tagManager.testStorage();
        
        // 执行标签清理
        tagManager.cleanupUnusedTags();
    }
}

// 通用DOM操作处理器
class DOMOperationHandler {
    static clearAndFill<T>(
        container: HTMLElement,
        items: T[],
        createElement: (item: T) => HTMLElement,
        emptyMessage?: string
    ): void {
        container.innerHTML = '';
        
        if (items.length === 0 && emptyMessage) {
            container.innerHTML = `<div style="text-align: center; opacity: 0.7; padding: 20px;">${emptyMessage}</div>`;
            return;
        }
        
        items.forEach(item => {
            const element = createElement(item);
            container.appendChild(element);
        });
    }

    static updateSelectOptions(
        select: HTMLSelectElement,
        items: { id: string; name: string }[],
        placeholder: string = '请选择...'
    ): void {
        select.innerHTML = `<option value="">${placeholder}</option>`;
        items.forEach(item => {
            const option = document.createElement('option');
            option.value = item.id;
            option.textContent = item.name;
            select.appendChild(option);
        });
    }
}

// 通用错误处理处理器
class ErrorHandler {
    static async executeWithErrorHandling<T>(
        operation: () => Promise<T>,
        errorMessage: string,
        context?: string
    ): Promise<T | null> {
        try {
            return await operation();
        } catch (error) {
            console.error(`${context ? `[${context}] ` : ''}${errorMessage}:`, error);
            updateStatus(errorMessage, true);
            return null;
        }
    }

    static async executeWithStatusUpdate<T>(
        operation: () => Promise<T>,
        loadingMessage: string,
        successMessage: string,
        errorMessage: string,
        context?: string
    ): Promise<T | null> {
        updateStatus(loadingMessage);
        
        try {
            const result = await operation();
            updateStatus(successMessage);
            return result;
        } catch (error) {
            console.error(`${context ? `[${context}] ` : ''}${errorMessage}:`, error);
            updateStatus(errorMessage, true);
            return null;
        }
    }
}

// 自动完成功能处理器
class AutocompleteHandler {
    private static selectedIndex = -1;
    private static currentMatches: GameplayTag[] = [];

    static init(input: HTMLInputElement, dropdown: HTMLDivElement) {
        input.addEventListener('input', (e) => {
            const query = (e.target as HTMLInputElement).value.trim();
            this.handleInput(query, dropdown);
        });

        input.addEventListener('keydown', (e) => {
            this.handleKeydown(e, input, dropdown);
        });

        input.addEventListener('blur', () => {
            // 延迟隐藏，让点击事件先触发
            setTimeout(() => this.hideDropdown(dropdown), 150);
        });

        input.addEventListener('focus', () => {
            if (input.value.trim()) {
                this.handleInput(input.value.trim(), dropdown);
            }
        });
    }

    private static handleInput(query: string, dropdown: HTMLDivElement) {
        if (!query) {
            this.hideDropdown(dropdown);
            return;
        }

        const allTags = tagManager.getAllTags();
        this.currentMatches = allTags.filter(tag => 
            tag.fullName.toLowerCase().includes(query.toLowerCase()) ||
            tag.name.toLowerCase().includes(query.toLowerCase())
        );

        if (this.currentMatches.length === 0) {
            this.hideDropdown(dropdown);
            return;
        }

        this.showDropdown(dropdown, this.currentMatches);
        this.selectedIndex = -1;
    }

    private static handleKeydown(e: KeyboardEvent, input: HTMLInputElement, dropdown: HTMLDivElement) {
        if (!dropdown.classList.contains('show')) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.selectedIndex = Math.min(this.selectedIndex + 1, this.currentMatches.length - 1);
                this.updateSelection(dropdown);
                break;
            case 'ArrowUp':
                e.preventDefault();
                this.selectedIndex = Math.max(this.selectedIndex - 1, -1);
                this.updateSelection(dropdown);
                break;
            case 'Enter':
                e.preventDefault();
                if (this.selectedIndex >= 0) {
                    this.selectItem(this.currentMatches[this.selectedIndex], input, dropdown);
                }
                break;
            case 'Escape':
                this.hideDropdown(dropdown);
                break;
        }
    }

    private static showDropdown(dropdown: HTMLDivElement, matches: GameplayTag[]) {
        dropdown.innerHTML = '';
        
        matches.forEach((tag) => {
            const item = document.createElement('div');
            item.className = 'autocomplete-item';
            item.innerHTML = `
                <div class="tag-color" style="background-color: ${tag.color}"></div>
                <div class="tag-name">${tag.name}</div>
                <div class="tag-fullname">${tag.fullName}</div>
            `;
            
            item.addEventListener('click', () => {
                this.selectItem(tag, newTagNameInput, dropdown);
            });
            
            dropdown.appendChild(item);
        });
        
        dropdown.classList.add('show');
    }

    private static hideDropdown(dropdown: HTMLDivElement) {
        dropdown.classList.remove('show');
        this.selectedIndex = -1;
    }

    private static updateSelection(dropdown: HTMLDivElement) {
        const items = dropdown.querySelectorAll('.autocomplete-item');
        items.forEach((item, index) => {
            item.classList.toggle('selected', index === this.selectedIndex);
        });
    }

    private static selectItem(tag: GameplayTag, input: HTMLInputElement, dropdown: HTMLDivElement) {
        input.value = tag.name;
        this.hideDropdown(dropdown);
        
        // 如果是标签筛选输入框，触发筛选
        if (input === tagFilterInput) {
            ModeManager.filterPagesByTag(tag.name);
        }
    }
}

// 初始化页面
async function initializePage() {
    const result = await ErrorHandler.executeWithStatusUpdate(
        async () => {
            // 首先初始化TagManager，确保数据从存储中加载
            await tagManager.initialize();
            
            // 获取当前标签页信息
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab || !tab.id || !tab.url) {
                throw new Error('无法获取当前页面信息');
            }
            
            // 创建或更新页面记录
            currentPage = tagManager.createOrUpdatePage(
                tab.url,
                tab.title || '无标题',
                new URL(tab.url).hostname,
                tab.favIconUrl
            );
            
            console.log('当前页面信息:', {
                url: currentPage.url,
                title: currentPage.title,
                pageId: currentPage.id,
                tags: currentPage.tags
            });
            
            // 加载所有数据
            await loadCurrentPageTags();
            
            // 初始化自动完成功能
            AutocompleteHandler.init(newTagNameInput, autocompleteDropdown);
            
            // 初始化模式管理器
            await ModeManager.init();
            
            // 初始化标签筛选的自动完成功能
            AutocompleteHandler.init(tagFilterInput, tagFilterDropdown);
            
            // 初始化所有事件监听器
            InitializationHelper.initEventListeners();
            
            // 显示数据加载状态
            const stats = tagManager.getDataStats();
            return `加载完成 - 标签: ${stats.tagsCount}, 页面: ${stats.pagesCount}`;
        },
        '正在加载...',
        '', // 成功消息将在操作中设置
        '初始化失败',
        '页面初始化'
    );
    
    if (result) {
        updateStatus(result);
    }
}


// 加载当前页面标签
async function loadCurrentPageTags() {
    if (!currentPage) {
        console.log('当前页面为空，无法加载标签');
        currentPageTitle.textContent = '无当前页面';
        return;
    }
    
    console.log('加载当前页面标签:', {
        pageId: currentPage.id,
        pageUrl: currentPage.url,
        pageTags: currentPage.tags
    });
    
    // 显示当前页面标题
    currentPageTitle.textContent = `${currentPage.title} (${currentPage.tags.length} 个标签)`;
    
    const allTags = tagManager.getAllTags();
    const pageTags = allTags.filter(tag => currentPage!.tags.includes(tag.id));
    const unusedTags = allTags.filter(tag => !currentPage!.tags.includes(tag.id));
    
    console.log('当前页面的标签:', pageTags.map(t => t.name));
    console.log('所有可用标签:', allTags.map(t => t.name));
    
    // 使用通用DOM操作处理器
    const allTagsToShow = [
        ...pageTags.map(tag => ({ tag, isSelected: true })),
        ...unusedTags.map(tag => ({ tag, isSelected: false }))
    ];
    
    DOMOperationHandler.clearAndFill(
        currentPageTags,
        allTagsToShow,
        (item) => createTagElement(item.tag, item.isSelected)
    );
}

// 创建标签元素
function createTagElement(tag: GameplayTag, isSelected: boolean): HTMLDivElement {
    const tagElement = document.createElement('div');
    tagElement.className = `tag-item${isSelected ? ' selected' : ''}`;
    // Only set backgroundColor if tag.color is defined
    if (typeof tag.color === 'string') {
        tagElement.style.backgroundColor = tag.color;
    }
    tagElement.innerHTML = `
        <span>${tag.name}</span>
        ${isSelected ? `<span class="tag-remove" data-tag-id="${tag.id}" title="点击移除标签">×</span>` : ''}
    `;
    
    // 添加工具提示
    if (isSelected) {
        tagElement.title = '点击移除标签';
    } else {
        tagElement.title = '点击添加标签';
    }
    
    if (isSelected) {
        // 移除标签 - 点击标签本身或删除按钮都可以移除
        tagElement.addEventListener('click', () => {
            handleTagPageOperation('remove', tag.id);
        });
        
        const removeBtn = tagElement.querySelector('.tag-remove') as HTMLSpanElement;
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            handleTagPageOperation('remove', tag.id);
        });
    } else {
        // 添加标签
        tagElement.addEventListener('click', () => {
            handleTagPageOperation('add', tag.id);
        });
    }
    
    return tagElement;
}


// 添加标签到页面或从页面移除标签（统一接口）
async function handleTagPageOperation(operation: 'add' | 'remove', tagId: string): Promise<void> {
    const result = await OperationWrapper.executeTagOperation(
        operation,
        tagId,
        operation === 'add' ? '标签已添加' : '标签已移除',
        operation === 'add' ? '添加标签失败' : '移除标签失败'
    );
    updateStatus(result.message, result.isError);
}

// 初始化
initializePage();
