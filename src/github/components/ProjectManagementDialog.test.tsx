import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ProjectManagementDialog } from "./ProjectManagementDialog";
import { useUserCollections } from "@/hooks/useUserCollections";

// Mock hooks
const mockCreateProject = vi.fn();
const mockUpdateProject = vi.fn();
const mockDeleteProject = vi.fn();

vi.mock("@/hooks/useUserCollections", () => ({
	useUserCollections: vi.fn(() => ({
		projects: [],
		createProject: mockCreateProject,
		updateProject: mockUpdateProject,
		deleteProject: mockDeleteProject,
	})),
}));

// Mock BaseDialog to avoid Radix UI portal/dialog issues in tests
interface BaseDialogMockProps {
	children: React.ReactNode;
	open: boolean;
	title: React.ReactNode;
}
vi.mock("@/components/ui/BaseDialog", () => ({
	BaseDialog: ({ children, open, title }: BaseDialogMockProps) =>
		open ? (
			<div data-testid="base-dialog">
				<h1>{title}</h1>
				{children}
			</div>
		) : null,
}));

// Mock ConfirmDialog as well to avoid portal/overlay issue in unit tests
interface ConfirmDialogMockProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => void;
	title: string;
}
vi.mock("@/components/ui/ConfirmDialog", () => ({
	ConfirmDialog: ({ open, onConfirm, title }: ConfirmDialogMockProps) =>
		open ? (
			<div data-testid="confirm-dialog">
				<h2>{title}</h2>
				<button onClick={onConfirm}>Confirmar Eliminación</button>
			</div>
		) : null,
}));

describe("ProjectManagementDialog", () => {
	const mockOnOpenChange = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(useUserCollections).mockReturnValue({
			projects: [],
			favorites: [],
			deploymentFavorites: [],
			activeTab: "favorites",
			toggleFavorite: vi.fn(),
			isFavorite: vi.fn(),
			toggleDeploymentFavorite: vi.fn(),
			isDeploymentFavorite: vi.fn(),
			createProject: mockCreateProject,
			updateProject: mockUpdateProject,
			deleteProject: mockDeleteProject,
			addRepoToProject: vi.fn(),
			removeRepoFromProject: vi.fn(),
			toggleRepoInProject: vi.fn(),
			getProjectsForRepo: vi.fn(),
			isRepoInProject: vi.fn(),
			addDeploymentToProject: vi.fn(),
			removeDeploymentFromProject: vi.fn(),
			toggleDeploymentInProject: vi.fn(),
			getProjectsForDeployment: vi.fn(),
			isDeploymentInProject: vi.fn(),
			setActiveTab: vi.fn(),
		});
	});

	it("should not render when closed", () => {
		render(<ProjectManagementDialog isOpen={false} onOpenChange={mockOnOpenChange} />);
		expect(screen.queryByTestId("base-dialog")).not.toBeInTheDocument();
	});

	it("should render empty state when open and no projects exist", () => {
		render(<ProjectManagementDialog isOpen={true} onOpenChange={mockOnOpenChange} />);
		expect(screen.getByTestId("base-dialog")).toBeInTheDocument();
		expect(screen.getByText("No tienes proyectos creados")).toBeInTheDocument();
		expect(screen.getByText(/Crea una colección para organizar/i)).toBeInTheDocument();
	});

	it("should render project list when projects exist", () => {
		const mockProjects = [
			{ id: "1", name: "Alpha Project", description: "Alpha description", repos: [], deployments: [] },
			{ id: "2", name: "Beta Project", description: "", repos: ["repo-1"], deployments: [] },
		];
		vi.mocked(useUserCollections).mockReturnValue({
			projects: mockProjects,
			favorites: [],
			deploymentFavorites: [],
			activeTab: "favorites",
			toggleFavorite: vi.fn(),
			isFavorite: vi.fn(),
			toggleDeploymentFavorite: vi.fn(),
			isDeploymentFavorite: vi.fn(),
			createProject: mockCreateProject,
			updateProject: mockUpdateProject,
			deleteProject: mockDeleteProject,
			addRepoToProject: vi.fn(),
			removeRepoFromProject: vi.fn(),
			toggleRepoInProject: vi.fn(),
			getProjectsForRepo: vi.fn(),
			isRepoInProject: vi.fn(),
			addDeploymentToProject: vi.fn(),
			removeDeploymentFromProject: vi.fn(),
			toggleDeploymentInProject: vi.fn(),
			getProjectsForDeployment: vi.fn(),
			isDeploymentInProject: vi.fn(),
			setActiveTab: vi.fn(),
		});

		render(<ProjectManagementDialog isOpen={true} onOpenChange={mockOnOpenChange} />);

		expect(screen.getByText("Alpha Project")).toBeInTheDocument();
		expect(screen.getByText("Alpha description")).toBeInTheDocument();
		expect(screen.getByText("Beta Project")).toBeInTheDocument();
		expect(screen.getByText("1 REPOS")).toBeInTheDocument();
	});

	it("should show create project form when click 'Nuevo Proyecto'", () => {
		render(<ProjectManagementDialog isOpen={true} onOpenChange={mockOnOpenChange} />);
		const newProjBtn = screen.getByRole("button", { name: /Nuevo Proyecto/i });
		fireEvent.click(newProjBtn);

		expect(screen.getByText("Crear nuevo proyecto")).toBeInTheDocument();
		expect(screen.getByLabelText("Nombre")).toBeInTheDocument();
		expect(screen.getByLabelText("Descripción")).toBeInTheDocument();
	});

	it("should call createProject when submitting the form", () => {
		render(<ProjectManagementDialog isOpen={true} onOpenChange={mockOnOpenChange} />);
		fireEvent.click(screen.getByRole("button", { name: /Nuevo Proyecto/i }));

		fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Gamma Project" } });
		fireEvent.change(screen.getByLabelText("Descripción"), { target: { value: "Gamma desc" } });

		fireEvent.click(screen.getByRole("button", { name: "Crear Proyecto" }));

		expect(mockCreateProject).toHaveBeenCalledWith("Gamma Project", "Gamma desc");
	});

	it("should trigger deletion when confirmation is confirmed", async () => {
		const mockProjects = [
			{ id: "1", name: "Alpha Project", description: "Alpha description", repos: [], deployments: [] },
		];
		vi.mocked(useUserCollections).mockReturnValue({
			projects: mockProjects,
			favorites: [],
			deploymentFavorites: [],
			activeTab: "favorites",
			toggleFavorite: vi.fn(),
			isFavorite: vi.fn(),
			toggleDeploymentFavorite: vi.fn(),
			isDeploymentFavorite: vi.fn(),
			createProject: mockCreateProject,
			updateProject: mockUpdateProject,
			deleteProject: mockDeleteProject,
			addRepoToProject: vi.fn(),
			removeRepoFromProject: vi.fn(),
			toggleRepoInProject: vi.fn(),
			getProjectsForRepo: vi.fn(),
			isRepoInProject: vi.fn(),
			addDeploymentToProject: vi.fn(),
			removeDeploymentFromProject: vi.fn(),
			toggleDeploymentInProject: vi.fn(),
			getProjectsForDeployment: vi.fn(),
			isDeploymentInProject: vi.fn(),
			setActiveTab: vi.fn(),
		});

		render(<ProjectManagementDialog isOpen={true} onOpenChange={mockOnOpenChange} />);

		// Click delete action button
		fireEvent.click(screen.getByRole("button", { name: "Eliminar" }));

		expect(screen.getByTestId("confirm-dialog")).toBeInTheDocument();
		expect(screen.getByText("Eliminar Proyecto")).toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: "Confirmar Eliminación" }));
		expect(mockDeleteProject).toHaveBeenCalledWith("1");
	});
});
