import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { ProjectSelector } from "./ProjectSelector"
import { useUserCollections } from "@/hooks/useUserCollections"

// Mock hooks
const mockCreateProject = vi.fn()
const mockAddRepoToProject = vi.fn()
const mockRemoveRepoFromProject = vi.fn()
const mockIsRepoInProject = vi.fn().mockReturnValue(false)
const mockGetProjectsForRepo = vi.fn().mockReturnValue([])
const mockToggleFavorite = vi.fn()
const mockIsFavorite = vi.fn().mockReturnValue(false)
const mockUpdateProject = vi.fn()
const mockDeleteProject = vi.fn()
const mockToggleRepoInProject = vi.fn()
const mockSetActiveTab = vi.fn()
const mockToggleDeploymentInProject = vi.fn()
const mockIsDeploymentInProject = vi.fn().mockReturnValue(false)

vi.mock("@/hooks/useUserCollections", () => ({
	useUserCollections: vi.fn(() => ({
		favorites: [],
		deploymentFavorites: [],
		projects: [],
		activeTab: "favorites",
		toggleFavorite: mockToggleFavorite,
		isFavorite: mockIsFavorite,
		toggleDeploymentFavorite: vi.fn(),
		isDeploymentFavorite: vi.fn(),
		createProject: mockCreateProject,
		updateProject: mockUpdateProject,
		deleteProject: mockDeleteProject,
		addRepoToProject: mockAddRepoToProject,
		removeRepoFromProject: mockRemoveRepoFromProject,
		toggleRepoInProject: mockToggleRepoInProject,
		getProjectsForRepo: mockGetProjectsForRepo,
		isRepoInProject: mockIsRepoInProject,
		addDeploymentToProject: vi.fn(),
		removeDeploymentFromProject: vi.fn(),
		toggleDeploymentInProject: mockToggleDeploymentInProject,
		getProjectsForDeployment: vi.fn(),
		isDeploymentInProject: mockIsDeploymentInProject,
		setActiveTab: mockSetActiveTab,
	})),
}))

interface BaseDialogMockProps {
	children: React.ReactNode
	open: boolean
	title: React.ReactNode
}

// Mock BaseDialog to avoid Radix UI issues in tests
vi.mock("@/components/ui/BaseDialog", () => ({
	BaseDialog: ({ children, open, title }: BaseDialogMockProps) =>
		open ? (
			<div data-testid="base-dialog">
				<h1>{title}</h1>
				{children}
			</div>
		) : null
}))

describe("ProjectSelector", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(useUserCollections).mockReturnValue({
			favorites: [],
			deploymentFavorites: [],
			projects: [],
			activeTab: "favorites",
			toggleFavorite: mockToggleFavorite,
			isFavorite: mockIsFavorite,
			toggleDeploymentFavorite: vi.fn(),
			isDeploymentFavorite: vi.fn(),
			createProject: mockCreateProject,
			updateProject: mockUpdateProject,
			deleteProject: mockDeleteProject,
			addRepoToProject: mockAddRepoToProject,
			removeRepoFromProject: mockRemoveRepoFromProject,
			toggleRepoInProject: mockToggleRepoInProject,
			getProjectsForRepo: mockGetProjectsForRepo,
			isRepoInProject: mockIsRepoInProject,
			addDeploymentToProject: vi.fn(),
			removeDeploymentFromProject: vi.fn(),
			toggleDeploymentInProject: mockToggleDeploymentInProject,
			getProjectsForDeployment: vi.fn(),
			isDeploymentInProject: mockIsDeploymentInProject,
			setActiveTab: mockSetActiveTab,
		})
	})

	it("should render trigger button", () => {
		render(<ProjectSelector repo="test-repo" />)
		expect(screen.getByRole("button", { name: /asignar a proyecto/i })).toBeInTheDocument()
		expect(screen.getByText(/PROYECTOS/i)).toBeInTheDocument()
	})

	it("should open unified projects dialog when clicked", () => {
		render(<ProjectSelector repo="test-repo" />)
		const trigger = screen.getByRole("button", { name: /asignar a proyecto/i })
		fireEvent.click(trigger)
		expect(screen.getByTestId("base-dialog")).toBeInTheDocument()
		expect(screen.getByText(/No tienes proyectos creados/i)).toBeInTheDocument()
	})

	it("should render projects in dialog when they exist", () => {
		const mockProjects = [
			{ id: "1", name: "Project 1", description: "Desc 1", repos: [], deployments: [] },
			{ id: "2", name: "Project 2", description: "Desc 2", repos: [], deployments: [] }
		]
		vi.mocked(useUserCollections).mockReturnValue({
			favorites: [],
			deploymentFavorites: [],
			projects: mockProjects,
			activeTab: "favorites",
			toggleFavorite: mockToggleFavorite,
			isFavorite: mockIsFavorite,
			toggleDeploymentFavorite: vi.fn(),
			isDeploymentFavorite: vi.fn(),
			createProject: mockCreateProject,
			updateProject: mockUpdateProject,
			deleteProject: mockDeleteProject,
			addRepoToProject: mockAddRepoToProject,
			removeRepoFromProject: mockRemoveRepoFromProject,
			toggleRepoInProject: mockToggleRepoInProject,
			getProjectsForRepo: mockGetProjectsForRepo,
			isRepoInProject: mockIsRepoInProject,
			addDeploymentToProject: vi.fn(),
			removeDeploymentFromProject: vi.fn(),
			toggleDeploymentInProject: mockToggleDeploymentInProject,
			getProjectsForDeployment: vi.fn(),
			isDeploymentInProject: mockIsDeploymentInProject,
			setActiveTab: mockSetActiveTab,
		})

		render(<ProjectSelector repo="test-repo" />)
		fireEvent.click(screen.getByRole("button", { name: /asignar a proyecto/i }))

		expect(screen.getByText("Project 1")).toBeInTheDocument()
		expect(screen.getByText("Project 2")).toBeInTheDocument()
	})

	it("should call toggleRepoInProject when a project is clicked", () => {
		const mockProjects = [
			{ id: "p1", name: "Project 1", description: "Desc 1", repos: [], deployments: [] }
		]
		vi.mocked(useUserCollections).mockReturnValue({
			...vi.mocked(useUserCollections)(),
			projects: mockProjects,
		})

		render(<ProjectSelector repo="test-repo" />)
		fireEvent.click(screen.getByRole("button", { name: /asignar a proyecto/i }))

		fireEvent.click(screen.getByText("Project 1"))
		expect(mockToggleRepoInProject).toHaveBeenCalledWith("p1", "test-repo")
	})
})
