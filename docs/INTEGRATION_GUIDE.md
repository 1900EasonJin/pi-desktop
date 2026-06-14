# 性能优化集成指南

本指南介绍如何将性能优化功能集成到现有的 App.tsx 中。

## 快速开始

### 1. 安装依赖（已包含在项目中）

所有优化组件和 Hooks 都已创建，无需额外安装。

### 2. 导入优化模块

在 `App.tsx` 顶部添加导入：

```tsx
import { useMessagePagination } from "./hooks/useMessagePagination";
import { useSessionLoader } from "./hooks/useSessionLoader";
import { LazyWrapper } from "./hooks/useLazyComponent";
import { IncrementalRenderer } from "./components/ui/IncrementalRenderer";
```

## 逐步集成

### 步骤 1: 消息分页加载

**目标**: 减少首屏渲染的消息数量，向上滚动时加载历史消息

**修改位置**: `App.tsx` 第 504-511 行

**修改前**:
```tsx
const renderedMessages = useMemo(
  () => groupToolMessages(activeMessages),
  [activeMessages],
);
```

**修改后**:
```tsx
// 1. 添加消息分页 Hook
const {
  visibleMessages: paginatedMessages,
  hasMore: hasMoreMessages,
  loadMore: loadMoreMessages,
  isLoading: isLoadingMoreMessages,
} = useMessagePagination({
  messages: activeMessages,
  initialPageSize: 50,
  pageSize: 30,
  enabled: activeMessages.length > 50, // 超过50条才启用分页
});

// 2. 使用分页后的消息
const renderedMessages = useMemo(
  () => groupToolMessages(paginatedMessages),
  [paginatedMessages],
);

// 3. 在消息列表顶部添加"加载更多"按钮
// 修改位置: 第 3086-3100 行，在 <section className="message-timeline"> 内
```

**添加加载更多按钮**（在消息列表开头）:
```tsx
<section className="message-timeline" ref={timelineRef}>
  {/* 加载更多历史消息按钮 */}
  {hasMoreMessages && !isAgentStarting && (
    <div className="load-more-container">
      <button
        className="load-more-messages"
        onClick={loadMoreMessages}
        disabled={isLoadingMoreMessages}
      >
        {isLoadingMoreMessages 
          ? t("app.loadingMore") 
          : t("app.loadMoreMessages", { count: activeMessages.length - paginatedMessages.length })
        }
      </button>
    </div>
  )}
  
  {/* 现有的消息渲染逻辑 */}
  {activeAgent?.status === "starting" && (
    // ...
  )}
</section>
```

### 步骤 2: 延迟加载项目会话

**目标**: 只在项目展开时加载会话列表，减少初始加载

**修改位置**: `App.tsx` 第 838-842 行

**修改前**:
```tsx
useEffect(() => {
  // ...
  for (const project of projects) {
    void refreshProjectSessions(project.id).catch(() => undefined);
  }
}, [projectIdsKey]);
```

**修改后**:
```tsx
// 移除自动加载所有项目会话的逻辑
// 改为在渲染项目时按需加载

// 在项目列表渲染处（第 2614 行附近），为每个项目使用延迟加载
```

**在项目渲染中集成**（第 2614-2897 行）:
```tsx
{filteredProjects.map((project) => {
  // 现有代码...
  
  // 添加延迟加载 Hook
  const isCollapsed = collapsedProjects.has(project.id);
  const { 
    sessions: lazyLoadedSessions, 
    isLoading: sessionLoading 
  } = useSessionLoader({
    projectId: project.id,
    isCollapsed,
    loadFn: (id) => api.sessions.list(id),
    enabled: !projectIsChat,
  });
  
  // 使用延迟加载的会话而不是 sessionsByProject
  const projectSessions = lazyLoadedSessions;
  
  // 更新 loading 状态
  const projectSessionsLoading = sessionLoading;
  
  // 其余代码保持不变...
})}
```

### 步骤 3: 抽屉内容懒加载

**目标**: 抽屉不可见时不渲染内容，节省资源

**修改位置**: `App.tsx` 第 3359-3405 行

**修改前**:
```tsx
{drawer && !drawerCollapsed && (
  <aside className="detail-drawer">
    <DrawerContent
      panel={drawer}
      // ...
    />
  </aside>
)}
```

**修改后**:
```tsx
{drawer && !drawerCollapsed && (
  <aside className="detail-drawer">
    <LazyWrapper
      enabled={true}
      threshold={0}
      rootMargin="50px"
      placeholder={
        <div className="drawer-loading">
          <div className="loader" />
          <span>{t("app.drawerLoading")}</span>
        </div>
      }
    >
      <DrawerContent
        panel={drawer}
        project={drawer === "sessions" ? sessionsProject : undefined}
        files={files}
        sessions={sessions}
        modifiedFiles={modifiedFiles}
        expandedDirs={expandedDirs}
        onToggleDirectory={toggleDirectory}
        pinned={drawerPinned}
        onTogglePin={toggleDrawerPinned}
        onCollapse={collapseDrawer}
        onClose={closeDrawer}
        onFileContextMenu={(node, x, y) => setFileMenu({ node, x, y })}
        onRefreshFiles={() => refreshFiles(activeProjectId)}
        onRefreshSessions={() =>
          refreshSessions(sessionsProjectId ?? activeProjectId)
        }
        onOpenSession={(session) =>
          createAgent(
            sessionsProjectId ?? activeProjectId,
            session.filePath,
            session.name || t("common.untitled"),
          )
        }
        onRenameSession={async (filePath, newName) => {
          await api.sessions.rename(filePath, newName);
          await refreshSessions(sessionsProjectId ?? activeProjectId);
        }}
        onCopySession={(session) =>
          copySession(
            session.filePath,
            sessionsProjectId ?? activeProjectId,
          )
        }
        onExportSession={exportHistorySession}
        onDeleteSession={deleteHistorySession}
      />
    </LazyWrapper>
  </aside>
)}
```

### 步骤 4: 会话列表增量渲染

**目标**: 左侧边栏历史会话过多时分批渲染

**修改位置**: `App.tsx` 第 2828-2868 行

**修改前**:
```tsx
{!isCollapsed && displayedProjectSessions.length > 0 && (
  <div className="project-session-list">
    {displayedProjectSessions.map((session) => (
      <button key={session.filePath}>
        {/* 会话按钮 */}
      </button>
    ))}
  </div>
)}
```

**修改后**:
```tsx
{!isCollapsed && displayedProjectSessions.length > 0 && (
  <div className="project-session-list">
    <IncrementalRenderer
      items={displayedProjectSessions}
      renderItem={(session, index) => (
        <button
          key={session.filePath}
          className={
            isSameSessionPath(
              activeAgent?.sessionPath,
              session.filePath,
            ) && !activeSessionShownAsAgent
              ? "conversation agent-row session-row active"
              : "conversation agent-row session-row"
          }
          title={session.filePath}
          onContextMenu={(event) => {
            event.preventDefault();
            setSessionMenu({
              x: event.clientX,
              y: event.clientY,
              projectId: project.id,
              session,
            });
          }}
          onClick={() =>
            void openSidebarSession(project.id, session)
          }
        >
          <span
            className="session-node-marker"
            aria-hidden="true"
          />
          <div className="conversation-body">
            <div className="conversation-title">
              <strong>
                {session.name || t("common.untitled")}
              </strong>
            </div>
          </div>
        </button>
      )}
      batchSize={10}
      batchDelay={16}
      className="session-list-renderer"
    />
  </div>
)}
```

## 添加样式

在 `src/renderer/src/styles.css` 中添加以下样式：

```css
/* 加载更多消息按钮 */
.load-more-container {
  display: flex;
  justify-content: center;
  padding: 16px;
  border-bottom: 1px solid var(--border-color);
}

.load-more-messages {
  padding: 8px 24px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.load-more-messages:hover {
  background: var(--bg-hover);
  border-color: var(--border-hover);
}

.load-more-messages:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 抽屉加载占位符 */
.drawer-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 12px;
  color: var(--text-secondary);
}

.drawer-loading .loader {
  width: 24px;
  height: 24px;
  border: 3px solid var(--border-color);
  border-top-color: var(--accent-color);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* 虚拟滚动容器 */
.virtual-scroller {
  position: relative;
  overflow-y: auto;
  will-change: scroll-position;
}

.virtual-scroller::-webkit-scrollbar {
  width: 8px;
}

.virtual-scroller::-webkit-scrollbar-thumb {
  background: var(--scrollbar-thumb);
  border-radius: 4px;
}

.virtual-scroller::-webkit-scrollbar-track {
  background: transparent;
}
```

## 添加国际化文本

在 `src/renderer/src/i18n.ts` 中添加翻译：

```typescript
const translations = {
  // 现有翻译...
  
  app: {
    // 现有翻译...
    loadMoreMessages: "加载更多历史消息 ({{count}} 条)",
    loadingMore: "加载中...",
    drawerLoading: "加载中...",
  },
};
```

## 测试建议

### 1. 消息分页测试

```typescript
// 在开发者工具控制台中执行
// 创建大量测试消息
const testMessages = Array.from({ length: 500 }, (_, i) => ({
  id: `test-${i}`,
  role: i % 2 === 0 ? "user" : "assistant",
  text: `测试消息 ${i}`,
  agentId: "test-agent",
  timestamp: Date.now() - i * 1000,
}));
```

### 2. 性能监控

```typescript
// 添加到 App.tsx 用于监控渲染性能
useEffect(() => {
  const start = performance.now();
  return () => {
    const duration = performance.now() - start;
    console.log(`Render took: ${duration.toFixed(2)}ms`);
  };
});
```

### 3. 内存监控

```typescript
// 在控制台中定期检查
console.log(
  `Memory: ${(performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`
);
```

## 回滚方案

如果遇到问题，可以逐个禁用优化：

```tsx
// 禁用消息分页
const { visibleMessages } = useMessagePagination({
  messages: activeMessages,
  enabled: false, // 禁用
});

// 禁用会话延迟加载
const { sessions } = useSessionLoader({
  projectId: project.id,
  isCollapsed: false, // 始终加载
  loadFn: api.sessions.list,
  enabled: false, // 禁用
});

// 禁用懒加载
<LazyWrapper enabled={false}>
  <Component />
</LazyWrapper>
```

## 常见问题

### Q: 消息分页后滚动到底部不工作了？

A: 确保在 `loadMore` 之后保持滚动位置：

```tsx
const loadMore = useCallback(() => {
  const timeline = timelineRef.current;
  const oldScrollHeight = timeline?.scrollHeight || 0;
  
  loadMoreMessages();
  
  requestAnimationFrame(() => {
    if (timeline) {
      const newScrollHeight = timeline.scrollHeight;
      timeline.scrollTop += newScrollHeight - oldScrollHeight;
    }
  });
}, [loadMoreMessages]);
```

### Q: 会话延迟加载导致首次展开闪烁？

A: 添加加载占位符：

```tsx
const { sessions, isLoading } = useSessionLoader({...});

{isLoading ? (
  <div className="sessions-loading">加载中...</div>
) : (
  sessions.map(...)
)}
```

### Q: 优化后内存反而增加了？

A: 检查是否有内存泄漏，确保清理 effect：

```tsx
useEffect(() => {
  // 订阅
  return () => {
    // 取消订阅
  };
}, []);
```

## 下一步

1. 运行应用，观察性能改善
2. 使用 Chrome DevTools Performance 面板验证
3. 根据实际情况调整参数（页面大小、overscan 等）
4. 考虑实现 Web Worker 进一步优化

## 获取帮助

如有问题，请查看：
- [性能优化文档](./PERFORMANCE_OPTIMIZATIONS.md)
- [提交 Issue](https://github.com/ayuayue/pi-desktop/issues)
