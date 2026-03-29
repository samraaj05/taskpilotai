import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

class SafeErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error(`[UI_ERROR_CAUGHT] ${this.props.name || 'Component'}:`, error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Card className="bg-slate-900/40 border-slate-800 border-dashed border-2 p-6 text-center">
          <CardContent className="space-y-4 pt-4">
            <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Section unavailable</h3>
              <p className="text-xs text-slate-400 mt-1">
                There was a problem rendering this part of the dashboard.
              </p>
            </div>
            <Button 
                variant="outline" 
                size="sm" 
                className="border-slate-700 text-slate-300 hover:bg-slate-800 h-8"
                onClick={this.handleReset}
            >
              <RefreshCcw className="w-3.5 h-3.5 mr-2" />
              Try again
            </Button>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

export default SafeErrorBoundary;
