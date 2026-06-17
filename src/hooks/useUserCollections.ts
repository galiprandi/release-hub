import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";

const STORAGE_KEY = "releasehub_user_collections";

export interface Project {
	id: string;
	name: string;
	description: string;
	repos: string[];
	deployments: string[];
}

export interface UserCollections {
	favorites: string[];
	deploymentFavorites: string[];
	projects: Project[];
	activeTab: string;
}

function getInitialCollections(): UserCollections {
	return { favorites: [], deploymentFavorites: [], projects: [], activeTab: "favorites" };
}

function loadCollectionsFromStorage(): UserCollections {
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			const data = JSON.parse(stored) as UserCollections;
			// Migration: ensure all projects have the deployments array
			if (data.projects) {
				data.projects = data.projects.map((p) => ({
					...p,
					repos: p.repos || [],
					deployments: p.deployments || []
				}));
			}
			return data;
		}
	} catch (error) {
		console.error("[UserCollections] Failed to load from localStorage:", error);
	}
	return getInitialCollections();
}

function saveCollectionsToStorage(collections: UserCollections): void {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(collections));
	} catch (error) {
		console.error("[UserCollections] Failed to save to localStorage:", error);
	}
}

export function useUserCollections() {
	const queryClient = useQueryClient();

	const { data = getInitialCollections() } = useQuery<UserCollections>({
		queryKey: queryKeys.user.collections(),
		queryFn: () => {
			const cached = queryClient.getQueryData<UserCollections>(queryKeys.user.collections());
			if (cached) return cached;
			return loadCollectionsFromStorage();
		},
		initialData: () => {
			return queryClient.getQueryData<UserCollections>(queryKeys.user.collections()) || loadCollectionsFromStorage();
		},
		staleTime: Infinity,
		gcTime: Infinity,
	});

	const mutate = useMutation({
		mutationFn: (next: UserCollections) => Promise.resolve(next),
		onMutate: async (next) => {
			await queryClient.cancelQueries({ queryKey: queryKeys.user.collections() });
			const previous = queryClient.getQueryData<UserCollections>(queryKeys.user.collections());
			queryClient.setQueryData(queryKeys.user.collections(), next);
			saveCollectionsToStorage(next);
			return { previous };
		},
		onError: (_err, _vars, context) => {
			if (context?.previous) {
				queryClient.setQueryData(queryKeys.user.collections(), context.previous);
				saveCollectionsToStorage(context.previous);
			}
		},
	});

	const setCollections = mutate.mutate;

	/* ---------- Favorites ---------- */
	const toggleFavorite = useCallback(
		(product: string) => {
			const next = { ...data, favorites: data.favorites || [] };
			if (next.favorites.includes(product)) {
				next.favorites = next.favorites.filter((f) => f !== product);
			} else {
				next.favorites = [...next.favorites, product];
			}
			setCollections(next);
		},
		[data, setCollections]
	);

	const isFavorite = useCallback(
		(product: string) => (data.favorites || []).includes(product),
		[data.favorites]
	);

	/* ---------- Deployment Favorites ---------- */
	const toggleDeploymentFavorite = useCallback(
		(deployment: string) => {
			const next = { ...data, deploymentFavorites: data.deploymentFavorites || [] };
			if (next.deploymentFavorites.includes(deployment)) {
				next.deploymentFavorites = next.deploymentFavorites.filter((f) => f !== deployment);
			} else {
				next.deploymentFavorites = [...next.deploymentFavorites, deployment];
			}
			setCollections(next);
		},
		[data, setCollections]
	);

	const isDeploymentFavorite = useCallback(
		(deployment: string) => (data.deploymentFavorites || []).includes(deployment),
		[data.deploymentFavorites]
	);

	/* ---------- Projects ---------- */
	const createProject = useCallback(
		(name: string, description: string, initialRepos?: string[], initialDeployments?: string[]) => {
			const id = name
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, "-")
				.replace(/(^-|-$)/g, "");
			if ((data.projects || []).some((p) => p.id === id)) return id;
			const next = {
				...data,
				projects: [
					...(data.projects || []),
					{
						id,
						name,
						description: description || "",
						repos: initialRepos || [],
						deployments: initialDeployments || [],
					},
				],
			};
			setCollections(next);
			return id;
		},
		[data, setCollections]
	);

	const updateProject = useCallback(
		(id: string, updates: Partial<Omit<Project, "id">>) => {
			const next = {
				...data,
				projects: (data.projects || []).map((p) =>
					p.id === id ? { ...p, ...updates } : p
				),
			};
			setCollections(next);
		},
		[data, setCollections]
	);

	const deleteProject = useCallback(
		(id: string) => {
			const next = {
				...data,
				projects: (data.projects || []).filter((p) => p.id !== id),
				activeTab: data.activeTab === id ? "favorites" : data.activeTab,
			};
			setCollections(next);
		},
		[data, setCollections]
	);

	const addRepoToProject = useCallback(
		(projectId: string, repo: string) => {
			const next = {
				...data,
				projects: (data.projects || []).map((p) =>
					p.id === projectId && !p.repos.includes(repo)
						? { ...p, repos: [...p.repos, repo] }
						: p
				),
			};
			setCollections(next);
		},
		[data, setCollections]
	);

	const removeRepoFromProject = useCallback(
		(projectId: string, repo: string) => {
			const next = {
				...data,
				projects: (data.projects || []).map((p) =>
					p.id === projectId
						? { ...p, repos: p.repos.filter((r) => r !== repo) }
						: p
				),
			};
			setCollections(next);
		},
		[data, setCollections]
	);

	const toggleRepoInProject = useCallback(
		(projectId: string, repo: string) => {
			const next = {
				...data,
				projects: (data.projects || []).map((p) => {
					if (p.id !== projectId) return p;
					const hasRepo = p.repos.includes(repo);
					return {
						...p,
						repos: hasRepo
							? p.repos.filter((r) => r !== repo)
							: [...p.repos, repo],
					};
				}),
			};
			setCollections(next);
		},
		[data, setCollections]
	);

	const getProjectsForRepo = useCallback(
		(repo: string) => (data.projects || []).filter((p) => p.repos.includes(repo)),
		[data.projects]
	);

	const isRepoInProject = useCallback(
		(projectId: string, repo: string) =>
			(data.projects || []).some(
				(p) => p.id === projectId && p.repos.includes(repo)
			),
		[data.projects]
	);

	const addDeploymentToProject = useCallback(
		(projectId: string, deployment: string) => {
			const next = {
				...data,
				projects: (data.projects || []).map((p) =>
					p.id === projectId && !p.deployments.includes(deployment)
						? { ...p, deployments: [...p.deployments, deployment] }
						: p
				),
			};
			setCollections(next);
		},
		[data, setCollections]
	);

	const removeDeploymentFromProject = useCallback(
		(projectId: string, deployment: string) => {
			const next = {
				...data,
				projects: (data.projects || []).map((p) =>
					p.id === projectId
						? { ...p, deployments: p.deployments.filter((d) => d !== deployment) }
						: p
				),
			};
			setCollections(next);
		},
		[data, setCollections]
	);

	const toggleDeploymentInProject = useCallback(
		(projectId: string, deployment: string) => {
			const next = {
				...data,
				projects: (data.projects || []).map((p) => {
					if (p.id !== projectId) return p;
					const hasDeployment = p.deployments.includes(deployment);
					return {
						...p,
						deployments: hasDeployment
							? p.deployments.filter((d) => d !== deployment)
							: [...p.deployments, deployment],
					};
				}),
			};
			setCollections(next);
		},
		[data, setCollections]
	);

	const getProjectsForDeployment = useCallback(
		(deployment: string) => (data.projects || []).filter((p) => p.deployments.includes(deployment)),
		[data.projects]
	);

	const isDeploymentInProject = useCallback(
		(projectId: string, deployment: string) =>
			(data.projects || []).some(
				(p) => p.id === projectId && p.deployments.includes(deployment)
			),
		[data.projects]
	);

	/* ---------- Active tab ---------- */
	const setActiveTab = useCallback(
		(tab: string) => {
			setCollections({ ...data, activeTab: tab || "favorites" });
		},
		[data, setCollections]
	);

	return {
		favorites: data.favorites || [],
		deploymentFavorites: data.deploymentFavorites || [],
		projects: data.projects || [],
		activeTab: data.activeTab || "favorites",
		toggleFavorite,
		isFavorite,
		toggleDeploymentFavorite,
		isDeploymentFavorite,
		createProject,
		updateProject,
		deleteProject,
		addRepoToProject,
		removeRepoFromProject,
		toggleRepoInProject,
		getProjectsForRepo,
		isRepoInProject,
		addDeploymentToProject,
		removeDeploymentFromProject,
		toggleDeploymentInProject,
		getProjectsForDeployment,
		isDeploymentInProject,
		setActiveTab,
	};
}
