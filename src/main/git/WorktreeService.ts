import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { app } from "electron";
import type { WorktreeEntry } from "../../shared/types";

const execFileAsync = promisify(execFile);

/**
 * 管理 git worktree 的创建、查询、删除。
 *
 * 工作树目录统一存放在 {userData}/worktrees/{projectId}/{slug}，
 * 不污染项目目录本身。
 */
export class WorktreeService {
	/**
	 * 获取指定项目仓库的所有 worktree（排除主工作区）。
	 * 使用 git worktree list --porcelain 解析。
	 */
	async list(projectPath: string): Promise<WorktreeEntry[]> {
		try {
			const { stdout } = await execFileAsync(
				"git",
				["worktree", "list", "--porcelain"],
				{ cwd: projectPath },
			);
			return this.parseWorktreeList(stdout, projectPath);
		} catch {
			// 非 git 目录或 git 未安装
			return [];
		}
	}

	/**
	 * 基于当前 HEAD 创建新的 worktree。
	 * 使用 OpenCode 的方式：--no-checkout -b {branch} 创建分支，再 git reset --hard 填充。
	 */
	async create(
		projectPath: string,
		projectId: string,
		branchName: string,
	): Promise<{ path: string; branch: string }> {
		const slug = this.slugify(branchName);
		const worktreeDir = this.resolveWorktreeDir(projectId, slug);
		const branch = `pideck/${slug}`;

		// 确保 worktree 根目录存在
		await mkdir(this.resolveWorktreeRootDir(projectId), { recursive: true });

		// 创建 worktree（仅创建目录结构，不 checkout）
		await execFileAsync(
			"git",
			["worktree", "add", "--no-checkout", "-b", branch, worktreeDir],
			{ cwd: projectPath },
		);

		// 填充工作树内容
		await execFileAsync(
			"git",
			["reset", "--hard"],
			{ cwd: worktreeDir },
		);

		return { path: worktreeDir, branch };
	}

	/**
	 * 删除指定 worktree。
	 * 先 git worktree remove --force，再清理目录，最后删除对应的分支。
	 */
	async remove(worktreePath: string, projectPath: string): Promise<boolean> {
		try {
			// 先尝试 git worktree remove
			await execFileAsync(
				"git",
				["worktree", "remove", "--force", worktreePath],
				{ cwd: projectPath },
			);
		} catch {
			// git worktree remove 失败时，尝试直接删除目录
		}

		// 清理目录
		try {
			await rm(worktreePath, { recursive: true, force: true });
		} catch {
			return false;
		}

		return true;
	}

	/**
	 * 生成唯一可用的目录名和分支名。
	 * 将分支名 slug 化，避免非法字符。
	 */
	private slugify(input: string): string {
		return input
			.trim()
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-+/, "")
			.replace(/-+$/, "")
			|| "workspace";
	}

	/** worktree 统一存放根目录：{userData}/worktrees/{projectId} */
	private resolveWorktreeRootDir(projectId: string): string {
		const userData = app.getPath("userData");
		return join(userData, "worktrees", projectId);
	}

	/** worktree 目录：{userData}/worktrees/{projectId}/{slug} */
	private resolveWorktreeDir(projectId: string, slug: string): string {
		return join(this.resolveWorktreeRootDir(projectId), slug);
	}

	/**
	 * 解析 git worktree list --porcelain 输出。
	 * 过滤掉主工作区（projectPath），只返回其他 worktree。
	 */
	private parseWorktreeList(stdout: string, projectPath: string): WorktreeEntry[] {
		const entries: WorktreeEntry[] = [];
		// 规范化路径用于比较（Windows 忽略大小写）
		const normalizedRoot = resolve(projectPath).toLowerCase();

		const lines = stdout.split(/\r?\n/);
		let current: Partial<WorktreeEntry> | null = null;

		for (const line of lines) {
			const trimmed = line.trim();
			if (!trimmed) {
				// 空行 = 条目结束
				if (current) {
					const path = current.path ? resolve(current.path) : "";
					if (path.toLowerCase() !== normalizedRoot && current.branch) {
						entries.push({
							path,
							branch: current.branch.replace(/^refs\/heads\//, ""),
						});
					}
					current = null;
				}
				continue;
			}

			if (trimmed.startsWith("worktree ")) {
				current = { path: trimmed.slice("worktree ".length).trim() };
				continue;
			}

			if (current && trimmed.startsWith("branch ")) {
				current.branch = trimmed.slice("branch ".length).trim();
			}
		}

		// 处理最后一条（文件可能不以空行结尾）
		if (current) {
			const path = current.path ? resolve(current.path) : "";
			if (path.toLowerCase() !== normalizedRoot && current.branch) {
				entries.push({
					path,
					branch: current.branch.replace(/^refs\/heads\//, ""),
				});
			}
		}

		return entries;
	}
}