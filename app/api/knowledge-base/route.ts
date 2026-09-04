import { NextRequest, NextResponse } from 'next/server';
import {
  getKnowledgeBaseItems,
  createKnowledgeBaseItem,
  updateKnowledgeBaseItem,
  deleteKnowledgeBaseItem,
} from '@/lib/queries';
import { env } from '@/lib/env';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const restaurantId = searchParams.get('restaurantId') || env.DEFAULT_RESTAURANT_ID || 'burger-joint';
    const category = searchParams.get('category') || undefined;
    const activeOnly = searchParams.get('activeOnly') === 'true';

    const items = await getKnowledgeBaseItems(restaurantId, { category, activeOnly });

    return NextResponse.json({
      success: true,
      data: items,
    });
  } catch (error: any) {
    console.error('Error in knowledge-base GET:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch knowledge base items' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { restaurant_id, title, category, content, is_active } = body;

    if (!restaurant_id || !title || !category || !content) {
      return NextResponse.json(
        { success: false, error: 'restaurant_id, title, category, and content are required' },
        { status: 400 }
      );
    }

    const item = await createKnowledgeBaseItem({
      restaurant_id,
      title: title.trim(),
      category: category.trim(),
      content: content.trim(),
      is_active: is_active ?? 1,
    });

    return NextResponse.json({
      success: true,
      data: item,
    });
  } catch (error: any) {
    console.error('Error in knowledge-base POST:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create knowledge base item' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, title, category, content, is_active } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Item ID is required' },
        { status: 400 }
      );
    }

    const updated = await updateKnowledgeBaseItem(id, {
      title: title?.trim(),
      category: category?.trim(),
      content: content?.trim(),
      is_active,
    });

    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Knowledge base item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error: any) {
    console.error('Error in knowledge-base PATCH:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update knowledge base item' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Item ID is required' },
        { status: 400 }
      );
    }

    const success = await deleteKnowledgeBaseItem(id);

    return NextResponse.json({
      success,
      message: success ? 'Deleted successfully' : 'Item not found',
    });
  } catch (error: any) {
    console.error('Error in knowledge-base DELETE:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete knowledge base item' },
      { status: 500 }
    );
  }
}
