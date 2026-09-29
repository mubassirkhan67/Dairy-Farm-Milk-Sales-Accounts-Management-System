import React, { useState, useMemo } from 'react';
import { useDairy } from '../context/DairyContext';
import { useAuth } from '../context/AuthContext';
import { Animal, AnimalType, AnimalStatus, Gender } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import {
  PiggyBank,
  Plus,
  Search,
  Tag,
  Calendar,
  Milk,
  DollarSign,
  AlertCircle,
  CheckCircle,
  X,
  Edit2,
  Trash2,
  BadgeDollarSign,
} from 'lucide-react';

interface AnimalsProps {
  onOpenSellAnimalModal: (animalId: string) => void;
}

export const Animals: React.FC<AnimalsProps> = ({ onOpenSellAnimalModal }) => {
  const { animals, addAnimal, updateAnimal, deleteAnimal, settings } = useDairy();
  const { can } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
  const [editingAnimal, setEditingAnimal] = useState<Animal | null>(null);

  const [formData, setFormData] = useState({
    animal_code: '',
    name: '',
    type: 'Cow' as AnimalType,
    breed: '',
    age: '',
    gender: 'Female' as Gender,
    purchase_date: '2025-01-01',
    purchase_price: 250000,
    status: 'Active' as AnimalStatus,
    milk_production: 18,
    photo: '',
    notes: '',
  });

  const filteredAnimals = useMemo(() => {
    return animals.filter((a) => {
      if (typeFilter !== 'all' && a.type !== typeFilter) return false;
      if (statusFilter !== 'all' && a.status !== statusFilter) return false;
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        a.animal_code.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q) ||
        a.breed.toLowerCase().includes(q) ||
        a.type.toLowerCase().includes(q)
      );
    });
  }, [animals, typeFilter, statusFilter, searchQuery]);

  const herdMetrics = useMemo(() => {
    const totalCount = animals.length;
    const activeCount = animals.filter((a) => a.status === 'Active').length;
    const totalProduction = animals
      .filter((a) => a.status === 'Active')
      .reduce((acc, a) => acc + (a.milk_production || 0), 0);
    const totalHerdValue = animals.reduce((acc, a) => acc + (a.purchase_price || 0), 0);
    return { totalCount, activeCount, totalProduction, totalHerdValue };
  }, [animals]);

  const handleOpenAdd = () => {
    const nextCode = `COW-0${animals.length + 1}`;
    setFormData({
      animal_code: nextCode,
      name: '',
      type: 'Cow',
      breed: 'Sahiwal',
      age: '3.5 Years',
      gender: 'Female',
      purchase_date: '2026-01-15',
      purchase_price: 260000,
      status: 'Active',
      milk_production: 18,
      photo: '/src/assets/images/photo_dairy_cow_1790607576400.jpg',
      notes: '',
    });
    setModalMode('add');
  };

  const handleOpenEdit = (a: Animal) => {
    setEditingAnimal(a);
    setFormData({
      animal_code: a.animal_code,
      name: a.name,
      type: a.type,
      breed: a.breed,
      age: a.age,
      gender: a.gender,
      purchase_date: a.purchase_date,
      purchase_price: a.purchase_price,
      status: a.status,
      milk_production: a.milk_production,
      photo: a.photo || '',
      notes: a.notes,
    });
    setModalMode('edit');
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.animal_code.trim()) return;

    if (modalMode === 'add') {
      addAnimal({
        ...formData,
        purchase_price: Number(formData.purchase_price) || 0,
        milk_production: Number(formData.milk_production) || 0,
      });
    } else if (modalMode === 'edit' && editingAnimal) {
      updateAnimal(editingAnimal.id, {
        ...formData,
        purchase_price: Number(formData.purchase_price) || 0,
        milk_production: Number(formData.milk_production) || 0,
      });
    }
    setModalMode(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-neutral-500 mb-1">
            <span>Livestock Registry</span>
            <span aria-hidden="true">·</span>
            <span>{animals.length} animals registered</span>
          </div>
          <h1 className="text-xl font-bold text-neutral-900 tracking-tight">
            Livestock & Animal Herd Management
          </h1>
          <p className="text-xs text-neutral-600 mt-0.5">
            Monitor dairy cattle, daily milk yield, pedigree breeds and health status.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Animal</span>
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-xs">
          <p className="text-xs text-neutral-500 font-medium">Total Registered Animals</p>
          <p className="text-2xl font-bold font-mono text-neutral-900 mt-1">
            {herdMetrics.totalCount} Heads
          </p>
        </div>
        <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-xs">
          <p className="text-xs text-neutral-500 font-medium">Active Milking Herd</p>
          <p className="text-2xl font-bold font-mono text-emerald-700 mt-1">
            {herdMetrics.activeCount} Milking
          </p>
        </div>
        <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-xs">
          <p className="text-xs text-neutral-500 font-medium">Daily Milk Capacity</p>
          <p className="text-2xl font-bold font-mono text-neutral-900 mt-1">
            {herdMetrics.totalProduction} Liters/Day
          </p>
        </div>
        <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-xs">
          <p className="text-xs text-neutral-500 font-medium">Total Livestock Asset Value</p>
          <p className="text-2xl font-bold font-mono text-neutral-900 mt-1">
            {formatCurrency(herdMetrics.totalHerdValue, settings.currency_symbol)}
          </p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by tag code, name, breed or type..."
            className="w-full pl-9 pr-4 py-2 text-xs border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All Types</option>
            <option value="Cow">Cows</option>
            <option value="Buffalo">Buffaloes</option>
            <option value="Goat">Goats</option>
            <option value="Other">Other</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Sold">Sold</option>
            <option value="Sick">Sick</option>
            <option value="Deceased">Deceased</option>
          </select>
        </div>
      </div>

      {/* Animal Cards Grid */}
      {filteredAnimals.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-xl p-10 text-center shadow-xs">
          <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-3 text-neutral-400">
            <Tag className="w-6 h-6" />
          </div>
          <h2 className="text-sm font-bold text-neutral-900 mb-1">No Livestock Records Found</h2>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto mb-4">
            {searchQuery || typeFilter !== 'all' || statusFilter !== 'all'
              ? 'No animals match your search filters.'
              : 'Your herd inventory is clean. Click below to register your first cow, buffalo, or livestock.'}
          </p>
          {can('manage_animals') && (
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add First Animal</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAnimals.map((animal) => {
          const isSold = animal.status === 'Sold';
          const isSick = animal.status === 'Sick';

          return (
            <div
              key={animal.id}
              className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-xs hover:border-neutral-300 transition-colors flex flex-col justify-between"
            >
              <div>
                {/* Photo or Fallback Graphic */}
                <div className="relative h-44 bg-neutral-100 overflow-hidden">
                  {animal.photo ? (
                    <img
                      src={animal.photo}
                      alt={animal.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-neutral-100 to-neutral-200 text-neutral-400">
                      <span className="text-3xl">🐄</span>
                      <span className="text-xs font-semibold mt-1">{animal.type}</span>
                    </div>
                  )}

                  {/* Status Badge */}
                  <span
                    className={`absolute top-3 right-3 text-[11px] font-bold px-2 py-0.5 rounded shadow-xs capitalize ${
                      animal.status === 'Active'
                        ? 'bg-emerald-600 text-white'
                        : isSold
                        ? 'bg-neutral-900 text-white'
                        : 'bg-rose-600 text-white'
                    }`}
                  >
                    {animal.status}
                  </span>

                  <span className="absolute bottom-3 left-3 text-xs font-mono font-bold text-white bg-black/75 px-2 py-0.5 rounded backdrop-blur-xs">
                    Tag: {animal.animal_code}
                  </span>
                </div>

                {/* Details */}
                <div className="p-4 space-y-2 text-xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-base font-bold text-neutral-900">{animal.name}</h3>
                      <p className="text-neutral-500 font-medium">
                        {animal.breed} · {animal.type} ({animal.gender})
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-neutral-400 block">Age</span>
                      <span className="font-semibold text-neutral-800">{animal.age}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-neutral-100">
                    <div>
                      <span className="text-[11px] text-neutral-500 block">Daily Milk Yield</span>
                      <span className="font-bold text-sm font-mono text-emerald-700">
                        {animal.milk_production} L/day
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-neutral-500 block">Purchase Value</span>
                      <span className="font-bold text-sm font-mono text-neutral-900">
                        {formatCurrency(animal.purchase_price, settings.currency_symbol)}
                      </span>
                    </div>
                  </div>

                  {animal.notes && (
                    <p className="pt-2 text-[11px] text-neutral-500 italic line-clamp-2">
                      "{animal.notes}"
                    </p>
                  )}
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="p-4 pt-2 border-t border-neutral-100 flex items-center justify-between gap-2">
                {!isSold ? (
                  <button
                    onClick={() => onOpenSellAnimalModal(animal.id)}
                    className="flex-1 py-1.5 px-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <BadgeDollarSign className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Sell Animal</span>
                  </button>
                ) : (
                  <span className="text-xs font-bold text-neutral-500 py-1.5">
                    Sold to buyer
                  </span>
                )}

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(animal)}
                    className="p-1.5 text-neutral-600 hover:text-blue-700 hover:bg-neutral-100 rounded-md"
                    title="Edit Animal"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  {can('delete_financial') && (
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete animal record ${animal.animal_code}?`)) {
                          deleteAnimal(animal.id);
                        }
                      }}
                      className="p-1.5 text-neutral-600 hover:text-rose-700 hover:bg-neutral-100 rounded-md"
                      title="Delete Animal"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        </div>
      )}

      {/* Add / Edit Animal Modal */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="bg-white border border-neutral-200 rounded-2xl w-full max-w-lg shadow-2xl p-6 my-auto text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
              <h2 className="text-base font-bold text-neutral-900">
                {modalMode === 'add' ? 'Register New Animal' : 'Edit Animal Details'}
              </h2>
              <button
                onClick={() => setModalMode(null)}
                className="text-neutral-400 hover:text-neutral-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="py-4 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Tag / Animal ID *</label>
                  <input
                    type="text"
                    value={formData.animal_code}
                    onChange={(e) => setFormData({ ...formData, animal_code: e.target.value })}
                    required
                    placeholder="e.g. COW-01"
                    className="w-full px-3 py-2 border rounded-lg font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Animal Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="e.g. Lakshmi"
                    className="w-full px-3 py-2 border rounded-lg font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Animal Type *</label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value as AnimalType })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="Cow">Cow</option>
                    <option value="Buffalo">Buffalo</option>
                    <option value="Goat">Goat</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Gender *</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value as Gender })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Status *</label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value as AnimalStatus })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="Active">Active</option>
                    <option value="Sold">Sold</option>
                    <option value="Sick">Sick</option>
                    <option value="Deceased">Deceased</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Breed</label>
                  <input
                    type="text"
                    value={formData.breed}
                    onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
                    placeholder="e.g. Sahiwal, Nili-Ravi"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Age</label>
                  <input
                    type="text"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    placeholder="e.g. 4 Years"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Daily Milk Yield (Liters/day)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={formData.milk_production}
                    onChange={(e) =>
                      setFormData({ ...formData, milk_production: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 border rounded-lg font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Purchase Price ({settings.currency_symbol})
                  </label>
                  <input
                    type="number"
                    step="1000"
                    value={formData.purchase_price}
                    onChange={(e) =>
                      setFormData({ ...formData, purchase_price: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 border rounded-lg font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">Photo URL / Path</label>
                <input
                  type="text"
                  value={formData.photo}
                  onChange={(e) => setFormData({ ...formData, photo: e.target.value })}
                  placeholder="/src/assets/images/... or web URL"
                  className="w-full px-3 py-2 border rounded-lg font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">Notes / Pedigree Details</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="e.g. Vaccinated on Sep 1st, 7% fat content"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="flex-1 py-2.5 border rounded-lg font-semibold hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg"
                >
                  {modalMode === 'add' ? 'Register Animal' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
