import { prisma } from "@peeramid-labs/dip-database";

async function main() {
  console.log("Connecting to the database to run diagnostics...");

  try {
    const ethereumProposalCount = await prisma.proposal.count({
      where: {
        repositoryProtocol: "ethereum",
      },
    });

    console.log(
      `Total proposals found for protocol 'ethereum': ${ethereumProposalCount}`,
    );

    const proposalsByRepo = await prisma.proposal.groupBy({
      by: ["repositoryOwner", "repositoryRepo", "repositoryProtocol"],
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: "desc",
        },
      },
    });

    console.log("\nProposal count by repository:");
    proposalsByRepo.forEach((repo) => {
      console.log(
        `- ${repo.repositoryOwner}/${repo.repositoryRepo} (${repo.repositoryProtocol}): ${repo._count.id} proposals`,
      );
    });
  } catch (error) {
    console.error("An error occurred while querying the database:", error);
  } finally {
    await prisma.$disconnect();
    console.log("\nDatabase connection closed.");
  }
}

main();
