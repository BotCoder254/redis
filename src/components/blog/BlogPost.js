import BookmarkButton from './BookmarkButton';

const BlogPost = ({ post }) => {
  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            {/* ... existing category and date ... */}
          </div>
          <div className="flex items-center space-x-3">
            <BookmarkButton postId={post.id} showText />
            {/* ... existing share button if any ... */}
          </div>
        </div>
        {/* ... rest of the existing code ... */}
      </div>
    </div>
  );
};

export default BlogPost; 