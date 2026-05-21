import { Component } from 'react';
import type { ReactNode } from 'react';
import { EmptyState } from './EmptyState';

export class ViewErrorBoundary extends Component<
  { viewKey: string; children: ReactNode },
  { message: string }
> {
  state = { message: '' };

  static getDerivedStateFromError(error: unknown) {
    return { message: error instanceof Error ? error.message : String(error) };
  }

  componentDidUpdate(previous: { viewKey: string }) {
    if (previous.viewKey !== this.props.viewKey && this.state.message) {
      this.setState({ message: '' });
    }
  }

  render() {
    if (this.state.message) {
      return (
        <EmptyState variant="panel">
          화면을 여는 중 문제가 생겼습니다. 새로고침 후 다시 눌러주세요.
          <span className="error-detail">{this.state.message}</span>
        </EmptyState>
      );
    }
    return this.props.children;
  }
}
