import { Card } from '../../app/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../app/components/ui/table';
import { Users, DollarSign, ClipboardCheck, Heart } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';

export const Home = () => {
  const { welfareTickets } = useApp();
  const activeTickets = welfareTickets.filter(t => t.status !== 'Settled & Cleared').slice(0, 5);

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <Card className="bg-[#002520] border-2 border-[#ffd700] p-4 md:p-8 mb-6 md:mb-8">
        <div className="text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-[#ffd700] mb-4">Welcome to Holy Cross CMO Portal</h2>
          <p className="text-gray-300 text-base md:text-lg mb-6">
            Digital Management System for Catholic Men Organization
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mt-8">
            <div className="bg-[#001a16] border border-[#ffd700] p-4 md:p-6 rounded-lg hover:scale-105 transition-all">
              <Users className="w-10 md:w-12 h-10 md:h-12 text-[#ffd700] mx-auto mb-4" />
              <h3 className="text-[#ffd700] font-semibold mb-2">Member Management</h3>
              <p className="text-gray-400 text-sm">Track and manage all organization members</p>
            </div>
            <div className="bg-[#001a16] border border-[#ffd700] p-4 md:p-6 rounded-lg hover:scale-105 transition-all">
              <DollarSign className="w-10 md:w-12 h-10 md:h-12 text-[#ffd700] mx-auto mb-4" />
              <h3 className="text-[#ffd700] font-semibold mb-2">Financial Records</h3>
              <p className="text-gray-400 text-sm">Secure ledger and transaction tracking</p>
            </div>
            <div className="bg-[#001a16] border border-[#ffd700] p-4 md:p-6 rounded-lg hover:scale-105 transition-all">
              <ClipboardCheck className="w-10 md:w-12 h-10 md:h-12 text-[#ffd700] mx-auto mb-4" />
              <h3 className="text-[#ffd700] font-semibold mb-2">Digital Workflow</h3>
              <p className="text-gray-400 text-sm">Streamlined administrative processes</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Welfare Transparency Dashboard */}
      <Card className="bg-[#002520] border-2 border-[#ffd700] p-4 md:p-6">
        <h3 className="text-xl md:text-2xl font-bold text-[#ffd700] mb-4 flex items-center gap-2">
          <Heart className="w-6 h-6" />
          Welfare Transparency Dashboard
        </h3>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-[#ffd700] hover:bg-[#001a16]">
                <TableHead className="text-[#ffd700]">Ticket ID</TableHead>
                <TableHead className="text-[#ffd700]">Member</TableHead>
                <TableHead className="text-[#ffd700]">Category</TableHead>
                <TableHead className="text-[#ffd700]">Amount</TableHead>
                <TableHead className="text-[#ffd700]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeTickets.map(ticket => (
                <TableRow key={ticket.ticketId} className="border-[#ffd700]/30 hover:bg-[#001a16]">
                  <TableCell className="text-white">{ticket.ticketId}</TableCell>
                  <TableCell className="text-white">{ticket.memberName}</TableCell>
                  <TableCell className="text-gray-400">{ticket.category}</TableCell>
                  <TableCell className="text-[#ffd700] font-semibold">₦{ticket.requestedAmount.toLocaleString()}</TableCell>
                  <TableCell>
                    <span className={`text-xs px-2 py-1 rounded ${
                      ticket.status === 'Awaiting Financial Audit' ? 'bg-yellow-500/20 text-yellow-500' :
                      ticket.status === 'Awaiting Disbursement' ? 'bg-blue-500/20 text-blue-500' :
                      'bg-green-500/20 text-green-500'
                    }`}>
                      {ticket.status}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
              {activeTickets.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-gray-400 py-8">
                    No active welfare tickets
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
};