/**
 * 性能测试示例
 *
 * 这个文件演示了如何使用性能优化组件
 */

import React, { useState } from "react";
import { VirtualScroller } from "../src/renderer/src/components/ui/VirtualScroller";
import { IncrementalRenderer } from "../src/renderer/src/components/ui/IncrementalRenderer";
import { LazyWrapper } from "../src/renderer/src/hooks/useLazyComponent";
import { useMessagePagination } from "../src/renderer/src/hooks/useMessagePagination";
import { useSessionLoader } from "../src/renderer/src/hooks/useSessionLoader";

// 生成测试数据
function generateTestMessages(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `msg-${i}`,
    role: i % 2 === 0 ? "user" : "assistant",
    text: `这是测试消息 ${i}。`.repeat(Math.floor(Math.random() * 5) + 1),
    timestamp: Date.now() - i * 1000,
  }));
}

function generateTestSessions(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `session-${i}`,
    name: `会话 ${i}`,
    filePath: `/path/to/session-${i}.jsonl`,
    preview: `这是会话 ${i} 的预览文本`,
    updatedAt: Date.now() - i * 3600000,
  }));
}

// 示例 1: 虚拟滚动
export function VirtualScrollExample() {
  const messages = generateTestMessages(1000);

  return (
    <div style={{ height: "600px" }}>
      <h2>虚拟滚动示例 (1000条消息)</h2>
      <VirtualScroller
        items={messages}
        itemHeight={80}
        renderItem={(msg, index) => (
          <div
            style={{
              padding: "12px",
              borderBottom: "1px solid #eee",
              backgroundColor: msg.role === "user" ? "#f5f5f5" : "#fff",
            }}
          >
            <strong>{msg.role}</strong>
            <p>{msg.text}</p>
            <small>Index: {index}</small>
          </div>
        )}
        overscan={3}
        onScroll={(scrollTop) => {
          if (scrollTop % 1000 === 0) {
            console.log("Scrolled to:", scrollTop);
          }
        }}
      />
    </div>
  );
}

// 示例 2: 消息分页
export function MessagePaginationExample() {
  const allMessages = generateTestMessages(500);

  const {
    visibleMessages,
    hasMore,
    loadMore,
    isLoading,
    totalCount,
    visibleCount,
  } = useMessagePagination({
    messages: allMessages,
    initialPageSize: 50,
    pageSize: 30,
    enabled: true,
  });

  return (
    <div>
      <h2>消息分页示例</h2>
      <p>
        显示 {visibleCount} / {totalCount} 条消息
      </p>

      {hasMore && (
        <button
          onClick={loadMore}
          disabled={isLoading}
          style={{
            padding: "8px 16px",
            marginBottom: "16px",
            cursor: isLoading ? "not-allowed" : "pointer",
          }}
        >
          {isLoading ? "加载中..." : `加载更多 (还有 ${totalCount - visibleCount} 条)`}
        </button>
      )}

      <div style={{ maxHeight: "400px", overflowY: "auto" }}>
        {visibleMessages.map((msg, index) => (
          <div
            key={msg.id}
            style={{
              padding: "8px",
              borderBottom: "1px solid #eee",
            }}
          >
            <strong>{msg.role}:</strong> {msg.text}
          </div>
        ))}
      </div>
    </div>
  );
}

// 示例 3: 懒加载组件
export function LazyLoadExample() {
  const [showAll, setShowAll] = useState(false);

  return (
    <div>
      <h2>懒加载组件示例</h2>
      <button onClick={() => setShowAll(!showAll)}>
        {showAll ? "隐藏" : "显示"}所有区域
      </button>

      <div style={{ height: "200px", overflowY: "auto", marginTop: "16px" }}>
        {/* 可见区域 */}
        <div style={{ padding: "16px", background: "#e3f2fd" }}>
          <h3>可见区域</h3>
          <p>这部分总是渲染</p>
        </div>

        {/* 懒加载区域 1 */}
        <LazyWrapper
          enabled={true}
          threshold={0}
          rootMargin="50px"
          placeholder={
            <div style={{ padding: "16px", background: "#fafafa" }}>
              <p>区域 1 加载中...</p>
            </div>
          }
        >
          <div style={{ padding: "16px", background: "#fff3e0" }}>
            <h3>懒加载区域 1</h3>
            <p>这部分滚动到可见区域时才渲染</p>
            <HeavyComponent label="区域 1" />
          </div>
        </LazyWrapper>

        {/* 懒加载区域 2 */}
        <LazyWrapper
          enabled={true}
          threshold={0}
          rootMargin="50px"
          placeholder={
            <div style={{ padding: "16px", background: "#fafafa" }}>
              <p>区域 2 加载中...</p>
            </div>
          }
        >
          <div style={{ padding: "16px", background: "#f3e5f5" }}>
            <h3>懒加载区域 2</h3>
            <p>这部分滚动到可见区域时才渲染</p>
            <HeavyComponent label="区域 2" />
          </div>
        </LazyWrapper>
      </div>
    </div>
  );
}

// 示例 4: 增量渲染
export function IncrementalRenderExample() {
  const items = generateTestSessions(100);

  return (
    <div>
      <h2>增量渲染示例 (100个会话)</h2>
      <p>会话列表会分批渲染，避免一次性渲染造成卡顿</p>

      <IncrementalRenderer
        items={items}
        renderItem={(session, index) => (
          <div
            style={{
              padding: "12px",
              borderBottom: "1px solid #eee",
              cursor: "pointer",
            }}
          >
            <strong>{session.name}</strong>
            <p style={{ color: "#666", fontSize: "14px" }}>
              {session.preview}
            </p>
            <small>Index: {index}</small>
          </div>
        )}
        batchSize={10}
        batchDelay={16}
        placeholder={
          <div style={{ padding: "12px", textAlign: "center" }}>
            <p>加载更多会话...</p>
          </div>
        }
      />
    </div>
  );
}

// 示例 5: 会话延迟加载
export function SessionLoaderExample() {
  const [projectId, setProjectId] = useState("project-1");
  const [isCollapsed, setIsCollapsed] = useState(true);

  const { sessions, isLoading, error, refresh } = useSessionLoader({
    projectId,
    isCollapsed,
    loadFn: async (id) => {
      // 模拟异步加载
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return generateTestSessions(20);
    },
    enabled: true,
  });

  return (
    <div>
      <h2>会话延迟加载示例</h2>

      <div style={{ marginBottom: "16px" }}>
        <label>
          项目:
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            style={{ marginLeft: "8px" }}
          >
            <option value="project-1">项目 1</option>
            <option value="project-2">项目 2</option>
            <option value="project-3">项目 3</option>
          </select>
        </label>

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          style={{ marginLeft: "16px" }}
        >
          {isCollapsed ? "展开" : "折叠"}
        </button>

        <button onClick={refresh} style={{ marginLeft: "8px" }}>
          刷新
        </button>
      </div>

      {isLoading ? (
        <p>加载中...</p>
      ) : error ? (
        <p style={{ color: "red" }}>错误: {error.message}</p>
      ) : !isCollapsed ? (
        <div>
          <p>共 {sessions.length} 个会话</p>
          <div style={{ maxHeight: "300px", overflowY: "auto" }}>
            {sessions.map((session) => (
              <div
                key={session.id}
                style={{ padding: "8px", borderBottom: "1px solid #eee" }}
              >
                <strong>{session.name}</strong>
                <p style={{ fontSize: "14px", color: "#666" }}>
                  {session.preview}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p>项目已折叠，展开以加载会话</p>
      )}
    </div>
  );
}

// 模拟重型组件
function HeavyComponent({ label }: { label: string }) {
  console.log(`${label} 渲染时间:`, new Date().toISOString());

  // 模拟耗时计算
  const result = Array.from({ length: 100 }, (_, i) => i * i).reduce(
    (a, b) => a + b,
    0
  );

  return (
    <div style={{ padding: "8px", background: "#f5f5f5", marginTop: "8px" }}>
      <p>重型组件: {label}</p>
      <p>计算结果: {result}</p>
    </div>
  );
}

// 完整示例应用
export function PerformanceTestApp() {
  const [activeTab, setActiveTab] = useState("virtual-scroll");

  const tabs = [
    { id: "virtual-scroll", label: "虚拟滚动" },
    { id: "pagination", label: "消息分页" },
    { id: "lazy-load", label: "懒加载组件" },
    { id: "incremental", label: "增量渲染" },
    { id: "session-loader", label: "会话延迟加载" },
  ];

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <h1>PiDeck 性能优化示例</h1>

      <div style={{ marginBottom: "20px", borderBottom: "2px solid #ddd" }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "10px 20px",
              marginRight: "8px",
              border: "none",
              background: activeTab === tab.id ? "#1976d2" : "#f5f5f5",
              color: activeTab === tab.id ? "white" : "black",
              cursor: "pointer",
              borderRadius: "4px 4px 0 0",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ marginTop: "20px" }}>
        {activeTab === "virtual-scroll" && <VirtualScrollExample />}
        {activeTab === "pagination" && <MessagePaginationExample />}
        {activeTab === "lazy-load" && <LazyLoadExample />}
        {activeTab === "incremental" && <IncrementalRenderExample />}
        {activeTab === "session-loader" && <SessionLoaderExample />}
      </div>

      <div
        style={{
          marginTop: "40px",
          padding: "16px",
          background: "#f5f5f5",
          borderRadius: "4px",
        }}
      >
        <h3>性能提示</h3>
        <ul>
          <li>打开 Chrome DevTools 的 Performance 面板查看详细性能数据</li>
          <li>使用 React DevTools Profiler 记录组件渲染时间</li>
          <li>在 Console 中查看懒加载组件的渲染日志</li>
          <li>
            对比启用/禁用优化的性能差异（通过设置 <code>enabled: false</code>）
          </li>
        </ul>
      </div>
    </div>
  );
}

export default PerformanceTestApp;
