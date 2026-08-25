const sequelize = require("../../src/config/database");
const { Post } = require("../../src/schema");

async function migrateWorkflowStatuses() {
  console.log("Starting workflow status migration...");

  try {
    const posts = await Post.findAll({
      attributes: ["id", "uuid", "title", "status", "workflow_status", "published_at", "approved_by_user_uuid", "approved_at"],
    });

    console.log(`Found ${posts.length} posts to migrate`);

    let updatedCount = 0;
    for (const post of posts) {
      let newWorkflowStatus = post.workflow_status;
      let newApprovedAt = post.approved_at;
      let newPublishedAt = post.published_at;

      if (post.status === "publish") {
        if (post.workflow_status === "SUBMITTED" || !post.workflow_status) {
          // Published posts that were never reviewed - mark as PUBLISHED
          newWorkflowStatus = "PUBLISHED";
          if (!post.published_at) {
            newPublishedAt = post.createdAt || new Date();
          }
        } else if (post.workflow_status === "APPROVED") {
          // Already approved, just need published_at if missing
          if (!post.published_at) {
            newPublishedAt = post.updatedAt || new Date();
          }
        } else if (post.workflow_status === "PUBLISHED") {
          // Already correct
        }
      } else if (post.status === "draft") {
        if (post.workflow_status === "SUBMITTED" || !post.workflow_status) {
          // Draft posts stay as SUBMITTED
          newWorkflowStatus = "SUBMITTED";
        } else if (post.workflow_status === "IN_REVIEW") {
          // Keep as is
        } else if (post.workflow_status === "REVISION_REQUIRED") {
          // Keep as is
        } else if (post.workflow_status === "RESUBMITTED") {
          // Keep as is
        } else if (post.workflow_status === "APPROVED") {
          // Approved but status is draft - this shouldn't happen, but handle it
          newWorkflowStatus = "SUBMITTED";
        } else if (post.workflow_status === "PUBLISHED") {
          // Published but status is draft - reset to SUBMITTED
          newWorkflowStatus = "SUBMITTED";
        }
      } else if (post.status === "archived") {
        // Archived posts - keep as PUBLISHED for workflow history
        if (!post.workflow_status || post.workflow_status === "SUBMITTED") {
          newWorkflowStatus = "PUBLISHED";
        }
      }

      if (
        newWorkflowStatus !== post.workflow_status ||
        (newPublishedAt && newPublishedAt !== post.published_at) ||
        (newApprovedAt && newApprovedAt !== post.approved_at)
      ) {
        await post.update({
          workflow_status: newWorkflowStatus,
          published_at: newPublishedAt || post.published_at,
          approved_at: newApprovedAt || post.approved_at,
        });
        updatedCount++;
        console.log(`Updated post ${post.uuid} (${post.title}): workflow_status=${newWorkflowStatus}`);
      }
    }

    console.log(`Migration complete. Updated ${updatedCount} posts.`);
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) {
  migrateWorkflowStatuses()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { migrateWorkflowStatuses };