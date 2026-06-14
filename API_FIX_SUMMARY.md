# API 调用问题修复总结

## 🔍 问题分析

### 根本原因
PiDeck 的 `ConfigManager.ts` 中，`buildModelsRequest` 方法没有设置 User-Agent，导致：
- 获取模型列表时被某些 API 服务拒绝
- 返回 403 `client_restricted` 错误

### 具体问题
1. **`buildModelsRequest`** (获取模型列表) - ❌ 没有 User-Agent
2. **`buildTestRequest`** (测试连接) - ✅ 有 User-Agent

所以测试连接可能成功，但实际使用时失败。

---

## ✅ 已修复内容

### 修改文件
`src/main/config/ConfigManager.ts` - `buildModelsRequest` 方法

### 修改前
```typescript
if (api === "anthropic-messages") {
  return {
    url: `${u}/models`,
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
  };
}
```

### 修改后
```typescript
if (api === "anthropic-messages") {
  return {
    url: `${u}/models`,
    headers: this.withAnthropicSdkUserAgent({
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    }),
  };
}
```

现在会自动添加：
- Anthropic API: `User-Agent: anthropic-sdk-typescript/0.27.3`
- OpenAI API: `User-Agent: OpenAI/JS 6.26.0`

---

## 🧪 测试建议

### 1. 测试 muyuan.do
```bash
npm run dev
```

在应用中：
1. 选择 `muyuan.do` provider
2. 选择 `claude-opus-4-8` 模型
3. 发送测试消息

**预期结果**：应该可以正常工作，不再出现 `client_restricted` 错误

### 2. 关于 fcapp.run 的问题

该服务返回：`"1m 上下文已经全量可用，请启用 1m 上下文后重试"`

**可能的原因**：
- 服务端配置问题
- 需要特殊的账户设置
- 需要特定的请求参数

**建议**：
1. 联系服务商询问如何启用
2. 暂时使用 `muyuan.do` 代替

---

## 📊 配置文件说明

你的 `~/.pi/agent/models.json` 中：

### muyuan.do 配置
```json
{
  "baseUrl": "https://muyuan.do",
  "api": "anthropic-messages",
  "headers": {
    "User-Agent": "anthropic-sdk-typescript/0.27.3"
  }
}
```

**注意**：配置文件中的 `headers` 设置目前**没有被使用**。应用会自动添加合适的 User-Agent。

### fcapp.run 配置
```json
{
  "baseUrl": "https://a-ocnfniawgw.cn-shanghai.fcapp.run",
  "api": "anthropic-messages",
  "models": [
    {"id": "claude-opus-4-8[1M]"}
  ]
}
```

模型名称中的 `[1M]` 只是一个标记，实际请求时使用 `claude-opus-4-8`。

---

## 🎯 后续优化建议

### 1. 支持自定义 User-Agent
让 `buildModelsRequest` 也接受 `requestHeaders` 参数，使用配置文件中的自定义 headers。

### 2. 支持配置文件中的 headers
读取 `models.json` 中每个 provider 的 `headers` 配置，并在请求时应用。

### 3. 添加调试日志
在发送请求时记录实际的 headers，方便排查问题。

---

## 📝 相关文件

- `src/main/config/ConfigManager.ts` - 配置管理和 API 请求构建
- `src/renderer/src/config/providerHeaders.ts` - User-Agent 选项列表
- `~/.pi/agent/models.json` - 用户的 API 配置
- `~/.pi/agent/auth.json` - API 密钥配置

---

## ✨ 总结

**修复完成！** 现在 PiDeck 应该可以正常使用 `muyuan.do` 的 API 了。

对于 `fcapp.run`，建议联系服务商解决"1m 上下文"的问题。
